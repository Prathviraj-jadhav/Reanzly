"use client";
// ===========================================================================
// Reanzly Call Store - REAL WebRTC audio/video calling + screen share.
// ===========================================================================
// Signaling relay lives in mini-services/chat-service (call:invite/accept/
// reject/cancel/end/offer/answer/ice-candidate - see that file's header
// comment for the full event contract). This store owns the actual
// RTCPeerConnection, local/remote MediaStreams, and drives UI state from
// real connection/track events - there is no simulated timer anywhere here.
//
// STUN-only (Google's public STUN server). That's sufficient for most home/
// office networks and demo purposes; a symmetric-NAT network would need a
// TURN relay to connect, which is a real, known limitation worth calling out
// rather than silently pretending every network works.
// ===========================================================================

import { create } from "zustand";
import { getChatSocket } from "@/lib/chat/socket-client";

const ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

export type CallStatus =
  | "idle"
  | "outgoing-ringing" // we called, waiting for them to accept
  | "incoming-ringing" // they called, waiting for us to accept/reject
  | "connecting" // accepted, negotiating SDP/ICE
  | "connected"
  | "ended";

export interface IncomingCallInfo {
  callId: string;
  conversationId: string | null;
  type: "audio" | "video";
  caller: { id: string; name: string; role: string };
}

interface CallState {
  status: CallStatus;
  callId: string | null;
  type: "audio" | "video";
  conversationId: string | null;
  otherPartyId: string | null;
  otherPartyName: string | null;
  // Explicit, not inferred: the caller creates the SDP offer once
  // call:accepted arrives, the callee waits for it and answers. Inferring
  // this from other state (e.g. comparing ids) is exactly the kind of thing
  // that's easy to get backwards - this flag removes the ambiguity.
  isCaller: boolean;
  incoming: IncomingCallInfo | null; // set only while status === "incoming-ringing"
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  muted: boolean;
  cameraOff: boolean;
  screenSharing: boolean;
  error: string | null;

  startCall: (opts: { conversationId: string; calleeId: string; calleeName: string; type: "audio" | "video"; scheduledCallId?: string }) => Promise<void>;
  acceptIncoming: () => Promise<void>;
  rejectIncoming: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  toggleScreenShare: () => Promise<void>;
  /** Wires the socket listeners. Call once, e.g. from AppShell on mount. */
  attachSocketListeners: () => () => void;
}

let pc: RTCPeerConnection | null = null;
let pendingIceCandidates: RTCIceCandidateInit[] = [];
let cameraTrack: MediaStreamTrack | null = null; // kept aside while screen-sharing, to restore on stop

function closePeerConnection() {
  if (pc) {
    pc.close();
    pc = null;
  }
  pendingIceCandidates = [];
  cameraTrack = null;
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop());
}

export const useCallStore = create<CallState>((set, get) => ({
  status: "idle",
  callId: null,
  type: "audio",
  conversationId: null,
  otherPartyId: null,
  otherPartyName: null,
  isCaller: false,
  incoming: null,
  localStream: null,
  remoteStream: null,
  muted: false,
  cameraOff: false,
  screenSharing: false,
  error: null,

  startCall: async ({ conversationId, calleeId, calleeName, type, scheduledCallId }) => {
    const socket = getChatSocket();
    if (!socket) {
      set({ error: "Not connected to chat service." });
      return;
    }
    if (get().status !== "idle") return;

    set({
      status: "outgoing-ringing",
      type,
      conversationId,
      otherPartyId: calleeId,
      otherPartyName: calleeName,
      isCaller: true,
      error: null,
    });

    socket.emit(
      "call:invite",
      { conversationId, calleeIds: [calleeId], type, scheduledCallId },
      (res: { ok: boolean; callId?: string; error?: string }) => {
        if (!res.ok || !res.callId) {
          set({ status: "idle", error: res.error || "Could not start the call." });
          return;
        }
        set({ callId: res.callId });
      }
    );
  },

  acceptIncoming: async () => {
    const socket = getChatSocket();
    const incoming = get().incoming;
    if (!socket || !incoming) return;
    set({
      status: "connecting",
      callId: incoming.callId,
      type: incoming.type,
      conversationId: incoming.conversationId,
      otherPartyId: incoming.caller.id,
      otherPartyName: incoming.caller.name,
      isCaller: false,
      incoming: null,
    });
    socket.emit("call:accept", { callId: incoming.callId });
    // The callee doesn't create the offer - it waits for call:offer from the
    // caller once call:accepted round-trips (see attachSocketListeners).
    await ensureLocalMedia(get().type);
  },

  rejectIncoming: () => {
    const socket = getChatSocket();
    const incoming = get().incoming;
    if (!socket || !incoming) return;
    socket.emit("call:reject", { callId: incoming.callId });
    set({ incoming: null, status: "idle" });
  },

  endCall: () => {
    const socket = getChatSocket();
    const { callId, status } = get();
    if (socket && callId) {
      socket.emit(status === "outgoing-ringing" ? "call:cancel" : "call:end", { callId });
    }
    teardown();
  },

  toggleMute: () => {
    const { localStream, muted } = get();
    localStream?.getAudioTracks().forEach((t) => (t.enabled = muted)); // if currently muted, enabling now
    set({ muted: !muted });
  },

  toggleCamera: () => {
    const { localStream, cameraOff } = get();
    localStream?.getVideoTracks().forEach((t) => (t.enabled = cameraOff)); // if currently off, enabling now
    set({ cameraOff: !cameraOff });
  },

  toggleScreenShare: async () => {
    const { screenSharing } = get();
    if (!pc) return;
    const sender = pc.getSenders().find((s) => s.track?.kind === "video");
    if (!sender) return;

    if (!screenSharing) {
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = displayStream.getVideoTracks()[0];
        cameraTrack = sender.track;
        await sender.replaceTrack(screenTrack);
        // Auto-revert if the user stops sharing via the browser's own UI.
        screenTrack.onended = () => get().toggleScreenShare();
        set({ screenSharing: true });
      } catch {
        set({ error: "Screen share permission was denied or cancelled." });
      }
    } else {
      if (cameraTrack) await sender.replaceTrack(cameraTrack);
      cameraTrack = null;
      set({ screenSharing: false });
    }
  },

  attachSocketListeners: () => {
    const socket = getChatSocket();
    if (!socket) return () => {};

    const onIncoming = (payload: IncomingCallInfo) => {
      // Ignore a second incoming call while one is already ringing/active -
      // a real product would offer "busy" here; out of scope for this pass.
      if (useCallStore.getState().status !== "idle") return;
      set({ status: "incoming-ringing", incoming: payload });
    };

    const onAccepted = async (payload: { callId: string; by: { id: string; name: string } }) => {
      if (get().callId !== payload.callId) return;
      set({ status: "connecting" });
      // Only the caller creates the SDP offer - the callee already called
      // ensureLocalMedia in acceptIncoming and waits for call:offer.
      if (!get().isCaller) return;
      const gotMedia = await ensureLocalMedia(get().type);
      if (!gotMedia) return; // ensureLocalMedia already ended the call and set an error
      const offer = await createOffer();
      socket.emit("call:offer", { callId: payload.callId, sdp: offer });
    };

    const onOffer = async (payload: { callId: string; sdp: RTCSessionDescriptionInit }) => {
      if (get().callId !== payload.callId || !pc) return;
      await pc.setRemoteDescription(payload.sdp);
      await flushPendingIce();
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("call:answer", { callId: payload.callId, sdp: answer });
    };

    const onAnswer = async (payload: { callId: string; sdp: RTCSessionDescriptionInit }) => {
      if (get().callId !== payload.callId || !pc) return;
      await pc.setRemoteDescription(payload.sdp);
      await flushPendingIce();
    };

    const onIceCandidate = async (payload: { callId: string; candidate: RTCIceCandidateInit }) => {
      if (get().callId !== payload.callId) return;
      if (!pc || !pc.remoteDescription) {
        pendingIceCandidates.push(payload.candidate);
        return;
      }
      await pc.addIceCandidate(payload.candidate).catch(() => {});
    };

    const onRejected = (payload: { callId: string }) => {
      if (get().callId !== payload.callId) return;
      set({ status: "ended" });
      setTimeout(() => teardown(), 1200);
    };
    const onCancelled = (payload: { callId: string }) => {
      if (get().callId !== payload.callId && get().incoming?.callId !== payload.callId) return;
      set({ status: "ended", incoming: null });
      setTimeout(() => teardown(), 1200);
    };
    const onEnded = (payload: { callId: string }) => {
      if (get().callId !== payload.callId) return;
      set({ status: "ended" });
      setTimeout(() => teardown(), 1200);
    };

    socket.on("call:incoming", onIncoming);
    socket.on("call:accepted", onAccepted);
    socket.on("call:offer", onOffer);
    socket.on("call:answer", onAnswer);
    socket.on("call:ice-candidate", onIceCandidate);
    socket.on("call:rejected", onRejected);
    socket.on("call:cancelled", onCancelled);
    socket.on("call:ended", onEnded);

    return () => {
      socket.off("call:incoming", onIncoming);
      socket.off("call:accepted", onAccepted);
      socket.off("call:offer", onOffer);
      socket.off("call:answer", onAnswer);
      socket.off("call:ice-candidate", onIceCandidate);
      socket.off("call:rejected", onRejected);
      socket.off("call:cancelled", onCancelled);
      socket.off("call:ended", onEnded);
    };
  },
}));

// Returns whether local media was actually acquired. Callers MUST check this
// before proceeding to createOffer()/createAnswer() - RTCPeerConnection.
// createOffer() happily produces a "valid" SDP offer even with zero tracks
// attached, so silently continuing past a getUserMedia failure doesn't
// throw or error anywhere obvious; it just negotiates a call with no audio,
// which is a much worse failure mode to ship silently than an explicit one.
async function ensureLocalMedia(type: "audio" | "video"): Promise<boolean> {
  const { setState, getState } = useCallStore;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === "video" ? { width: 640, height: 480 } : false,
    });
    setState({ localStream: stream });
    ensurePeerConnection();
    stream.getTracks().forEach((track) => pc!.addTrack(track, stream));
    return true;
  } catch {
    setState({ error: "Microphone/camera permission was denied. Check your browser's site settings." });
    getState().endCall();
    return false;
  }
}

function ensurePeerConnection(): RTCPeerConnection {
  if (pc) return pc;
  pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

  pc.onicecandidate = (e) => {
    const socket = getChatSocket();
    const callId = useCallStore.getState().callId;
    if (e.candidate && socket && callId) {
      socket.emit("call:ice-candidate", { callId, candidate: e.candidate.toJSON() });
    }
  };

  pc.ontrack = (e) => {
    useCallStore.setState((s) => {
      const remote = s.remoteStream ?? new MediaStream();
      remote.addTrack(e.track);
      return { remoteStream: remote, status: "connected" };
    });
  };

  pc.onconnectionstatechange = () => {
    if (pc && (pc.connectionState === "failed" || pc.connectionState === "disconnected")) {
      useCallStore.setState({ error: "Call connection lost." });
    }
  };

  return pc;
}

async function createOffer(): Promise<RTCSessionDescriptionInit> {
  ensurePeerConnection();
  const offer = await pc!.createOffer();
  await pc!.setLocalDescription(offer);
  return offer;
}

async function flushPendingIce() {
  if (!pc) return;
  for (const c of pendingIceCandidates) {
    await pc.addIceCandidate(c).catch(() => {});
  }
  pendingIceCandidates = [];
}

function teardown() {
  const { localStream, remoteStream } = useCallStore.getState();
  stopStream(localStream);
  stopStream(remoteStream);
  closePeerConnection();
  useCallStore.setState({
    status: "idle",
    callId: null,
    conversationId: null,
    otherPartyId: null,
    otherPartyName: null,
    isCaller: false,
    incoming: null,
    localStream: null,
    remoteStream: null,
    muted: false,
    cameraOff: false,
    screenSharing: false,
  });
}

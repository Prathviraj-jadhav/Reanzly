"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useCallStore } from "@/lib/store/call-store";
import type { ChatEntity, Conversation } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Phone,
  Video,
  Mic,
  MicOff,
  VideoOff,
  PhoneOff,
  ScreenShare,
  UserPlus,
  CalendarClock,
  X,
} from "lucide-react";

/**
 * Shared real-WebRTC call logic (useCallStore) + scheduled-call fetches,
 * used by both the compact drawer (chat-panel.tsx) and the full chat module
 * (chat-conversation.tsx) so desktop users get the same calling features
 * whichever surface they're in - previously only the drawer had this.
 */

export interface ScheduledCall {
  id: string;
  conversationId: string | null;
  type: "audio" | "video";
  scheduledFor: string;
  initiatorId: string;
}

export function formatCallDuration(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function formatScheduledFor(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return sameDay ? `Today, ${time}` : `${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}, ${time}`;
}

/**
 * conv may be null (e.g. the full chat module renders this before a
 * conversation is selected) - hooks must still run unconditionally, so
 * every conv.* access below is guarded rather than done via an early return.
 */
export function useChatCall(conv: Conversation | null, currentUserId: string, entities: ChatEntity[]) {
  // Real conversations get DB-generated cuids, not the old mock-data id
  // "c4" this used to check - detect by real participant membership.
  const isRean = !!conv?.participants.includes("rean");
  const callState = useCallStore();

  const otherEntity = React.useMemo(() => {
    if (!conv || conv.type === "channel") return null;
    const otherId = conv.participants.find((p) => p !== currentUserId);
    return otherId ? entities.find((e) => e.id === otherId) ?? null : null;
  }, [conv, currentUserId, entities]);

  const callIsForThisConv = !!conv && callState.status !== "idle" && callState.conversationId === conv.id;
  const callMode: "voice" | "video" | null = callIsForThisConv ? (callState.type === "video" ? "video" : "voice") : null;
  const muted = callState.muted;
  const cameraOff = callState.cameraOff;
  const screenShare = callState.screenSharing;
  const callStatus: "calling" | "connected" | "ended" =
    callState.status === "connected" ? "connected" : callState.status === "ended" ? "ended" : "calling";

  const [callSeconds, setCallSeconds] = React.useState(0);
  const callStartRef = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (callStatus !== "connected") {
      setCallSeconds(0);
      callStartRef.current = null;
      return;
    }
    callStartRef.current = Date.now();
    const interval = window.setInterval(() => {
      if (callStartRef.current) setCallSeconds(Math.floor((Date.now() - callStartRef.current) / 1000));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [callStatus]);

  const localVideoRef = React.useRef<HTMLVideoElement>(null);
  const remoteVideoRef = React.useRef<HTMLVideoElement>(null);
  const remoteAudioRef = React.useRef<HTMLAudioElement>(null);
  React.useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = callState.localStream;
  }, [callState.localStream]);
  React.useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = callState.remoteStream;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = callState.remoteStream;
  }, [callState.remoteStream]);

  const startCall = React.useCallback(
    (mode: "voice" | "video") => {
      if (!otherEntity || !conv) return;
      callState.startCall({
        conversationId: conv.id,
        calleeId: otherEntity.id,
        calleeName: otherEntity.name,
        type: mode === "video" ? "video" : "audio",
      });
    },
    [otherEntity, conv, callState]
  );

  const endCall = React.useCallback(() => callState.endCall(), [callState]);

  const [scheduledCalls, setScheduledCalls] = React.useState<ScheduledCall[]>([]);
  const [scheduleOpen, setScheduleOpen] = React.useState(false);
  const [scheduleWhen, setScheduleWhen] = React.useState("");
  const [scheduleType, setScheduleType] = React.useState<"voice" | "video">("voice");
  const [scheduleSubmitting, setScheduleSubmitting] = React.useState(false);

  const loadScheduledCalls = React.useCallback(() => {
    if (!conv || conv.type === "channel" || isRean) return;
    fetch(`/api/chat/calls?conversationId=${encodeURIComponent(conv.id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setScheduledCalls(data.calls))
      .catch(() => {});
  }, [conv, isRean]);

  React.useEffect(() => {
    loadScheduledCalls();
  }, [loadScheduledCalls]);

  const submitSchedule = React.useCallback(async () => {
    if (!otherEntity || !scheduleWhen || !conv) return;
    setScheduleSubmitting(true);
    try {
      const res = await fetch("/api/chat/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: conv.id,
          calleeId: otherEntity.id,
          type: scheduleType === "video" ? "video" : "audio",
          scheduledFor: new Date(scheduleWhen).toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error("Couldn't schedule the call", { description: data.error || "Try again." });
        return;
      }
      toast.success("Call scheduled", { description: `${scheduleType === "video" ? "Video" : "Voice"} call with ${otherEntity.name}` });
      setScheduleOpen(false);
      setScheduleWhen("");
      loadScheduledCalls();
    } finally {
      setScheduleSubmitting(false);
    }
  }, [otherEntity, scheduleWhen, scheduleType, conv, loadScheduledCalls]);

  const cancelScheduled = React.useCallback(
    async (callId: string) => {
      const res = await fetch(`/api/chat/calls?callId=${encodeURIComponent(callId)}`, { method: "DELETE" });
      if (res.ok) {
        toast("Scheduled call cancelled");
        loadScheduledCalls();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error("Couldn't cancel", { description: data.error });
      }
    },
    [loadScheduledCalls]
  );

  const joinScheduled = React.useCallback(
    (call: ScheduledCall) => {
      if (!otherEntity || !conv) return;
      callState.startCall({
        conversationId: conv.id,
        calleeId: otherEntity.id,
        calleeName: otherEntity.name,
        type: call.type,
        scheduledCallId: call.id,
      });
    },
    [otherEntity, conv, callState]
  );

  return {
    isRean,
    callState,
    otherEntity,
    callMode,
    callStatus,
    muted,
    cameraOff,
    screenShare,
    callSeconds,
    localVideoRef,
    remoteVideoRef,
    remoteAudioRef,
    startCall,
    endCall,
    scheduledCalls,
    scheduleOpen,
    setScheduleOpen,
    scheduleWhen,
    setScheduleWhen,
    scheduleType,
    setScheduleType,
    scheduleSubmitting,
    submitSchedule,
    cancelScheduled,
    joinScheduled,
  };
}

export type ChatCall = ReturnType<typeof useChatCall>;

/** Header buttons: voice call / video call / schedule + participant count. Hidden for channels. */
export function ChatCallHeaderButtons({
  call,
  conv,
  size = "sm",
}: {
  call: ChatCall;
  conv: Conversation;
  size?: "sm" | "md";
}) {
  if (conv.type === "channel") return null;
  const btnSize = size === "md" ? "h-7 w-7" : "h-6 w-6";
  const iconSize = size === "md" ? "h-3.5 w-3.5" : "h-3.5 w-3.5";
  return (
    <>
      <button
        onClick={() => call.startCall("voice")}
        className={cn("tap flex items-center justify-center rounded-[3px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors", btnSize)}
        aria-label="Start voice call"
        title="Voice call"
        disabled={!!call.callMode}
      >
        <Phone className={iconSize} />
      </button>
      <button
        onClick={() => call.startCall("video")}
        className={cn("tap flex items-center justify-center rounded-[3px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors", btnSize)}
        aria-label="Start video call"
        title="Video call"
        disabled={!!call.callMode}
      >
        <Video className={iconSize} />
      </button>
      {!call.isRean && (
        <Popover open={call.scheduleOpen} onOpenChange={call.setScheduleOpen}>
          <PopoverTrigger asChild>
            <button
              className={cn("tap flex items-center justify-center rounded-[3px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors", btnSize)}
              aria-label="Schedule a call"
              title="Schedule a call"
              disabled={!!call.callMode}
            >
              <CalendarClock className={iconSize} />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64">
            <div className="space-y-3">
              <div className="text-[11px] font-semibold">Schedule a call</div>
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant={call.scheduleType === "voice" ? "default" : "outline"}
                  className="h-7 flex-1 text-[11px]"
                  onClick={() => call.setScheduleType("voice")}
                >
                  <Phone className="h-3 w-3" /> Voice
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={call.scheduleType === "video" ? "default" : "outline"}
                  className="h-7 flex-1 text-[11px]"
                  onClick={() => call.setScheduleType("video")}
                >
                  <Video className="h-3 w-3" /> Video
                </Button>
              </div>
              <Input
                type="datetime-local"
                value={call.scheduleWhen}
                min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                onChange={(e) => call.setScheduleWhen(e.target.value)}
                className="h-8 text-[12px]"
              />
              <Button
                type="button"
                size="sm"
                className="h-7 w-full text-[11px]"
                disabled={!call.scheduleWhen || call.scheduleSubmitting}
                onClick={call.submitSchedule}
              >
                {call.scheduleSubmitting ? "Scheduling…" : "Schedule"}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </>
  );
}

/** The "upcoming scheduled calls" strip above the message list. */
export function ChatScheduledCallsBar({ call, currentUserId }: { call: ChatCall; currentUserId: string }) {
  if (call.callMode || call.scheduledCalls.length === 0) return null;
  return (
    <div className="flex shrink-0 flex-col gap-1 border-b border-border bg-accent/40 px-3 py-1.5">
      {call.scheduledCalls.map((sc) => (
        <div key={sc.id} className="flex items-center gap-2 text-[11px]">
          {sc.type === "video" ? <Video className="h-3 w-3 shrink-0 text-muted-foreground" /> : <Phone className="h-3 w-3 shrink-0 text-muted-foreground" />}
          <span className="min-w-0 flex-1 truncate text-muted-foreground">
            {sc.type === "video" ? "Video call" : "Voice call"} · {formatScheduledFor(sc.scheduledFor)}
          </span>
          <button
            onClick={() => call.joinScheduled(sc)}
            className="tap rounded-[2px] border border-border px-1.5 py-0.5 text-[10px] font-medium hover:bg-accent"
          >
            Join
          </button>
          {sc.initiatorId === currentUserId && (
            <button
              onClick={() => call.cancelScheduled(sc.id)}
              aria-label="Cancel scheduled call"
              className="tap rounded-[2px] px-1 py-0.5 text-[10px] text-muted-foreground hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

/** Full call overlay: remote tile, self PiP, screen-share indicator, control bar. */
export function ChatCallOverlay({ call, displayName }: { call: ChatCall; displayName: string }) {
  if (!call.callMode) return null;
  const { callMode, callStatus, callState, muted, cameraOff, screenShare, callSeconds, localVideoRef, remoteVideoRef, remoteAudioRef, otherEntity, endCall } = call;
  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-foreground text-background">
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">
        <audio ref={remoteAudioRef} autoPlay className="hidden" />
        {callMode === "video" && callStatus === "connected" && (
          <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 h-full w-full object-cover" />
        )}
        {!(callMode === "video" && callStatus === "connected") && (
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />
        )}
        {!(callMode === "video" && callStatus === "connected") && (
          <div className="relative flex flex-col items-center gap-3">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-background/30 bg-background/10 text-[28px] font-semibold tabular-nums">
              {displayName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div className="text-center">
              <div className="text-[14px] font-medium">{displayName}</div>
              <div className="mt-0.5 text-[11px] text-background/60">
                {callStatus === "calling" && (
                  <span className="flex items-center justify-center gap-1.5">
                    <span className="flex gap-0.5">
                      <span className="h-1 w-1 animate-bounce rounded-full bg-background/60" />
                      <span className="h-1 w-1 animate-bounce rounded-full bg-background/60" style={{ animationDelay: "150ms" }} />
                      <span className="h-1 w-1 animate-bounce rounded-full bg-background/60" style={{ animationDelay: "300ms" }} />
                    </span>
                    {callState.status === "connecting" ? "Connecting…" : callMode === "video" ? "Video calling…" : "Calling…"}
                  </span>
                )}
                {callStatus === "connected" && (
                  <span className="font-mono tabular-nums">
                    {callMode === "video" ? "Video · " : "Voice · "}
                    {formatCallDuration(callSeconds)}
                  </span>
                )}
                {callStatus === "ended" && <span>Call ended</span>}
              </div>
            </div>
            {otherEntity?.presence && callStatus === "connected" && (
              <div className="flex items-center gap-1 text-[10px] text-background/50">
                <span className="h-1.5 w-1.5 rounded-full bg-background/60" />
                <span>{otherEntity.presence === "online" ? "Active now" : otherEntity.presence}</span>
              </div>
            )}
          </div>
        )}

        {callMode === "video" && callStatus === "connected" && !cameraOff && (
          <div className="absolute bottom-3 right-3 h-24 w-32 overflow-hidden rounded-[6px] border border-background/30 bg-background/10">
            <video ref={localVideoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
          </div>
        )}

        {screenShare && callStatus === "connected" && (
          <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-[4px] border border-background/30 bg-background/10 px-2 py-1 text-[10px] font-medium">
            <ScreenShare className="h-3 w-3" />
            <span>Sharing screen</span>
          </div>
        )}
        {callState.error && (
          <div className="absolute bottom-3 left-3 right-3 rounded-[4px] border border-background/30 bg-background/10 px-2 py-1.5 text-[10px] text-background/80">
            {callState.error}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-center gap-2 border-t border-background/20 bg-background/5 px-4 py-3">
        <button
          onClick={() => callState.toggleMute()}
          className="tap flex h-9 w-9 items-center justify-center rounded-full border border-background/30 bg-background/10 hover:bg-background/20 transition-colors"
          aria-label={muted ? "Unmute" : "Mute"}
          title={muted ? "Unmute" : "Mute"}
        >
          {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>
        {callMode === "video" && (
          <button
            onClick={() => callState.toggleCamera()}
            className="tap flex h-9 w-9 items-center justify-center rounded-full border border-background/30 bg-background/10 hover:bg-background/20 transition-colors"
            aria-label={cameraOff ? "Turn camera on" : "Turn camera off"}
            title={cameraOff ? "Turn camera on" : "Turn camera off"}
          >
            {cameraOff ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
          </button>
        )}
        <button
          onClick={() => callState.toggleScreenShare()}
          className="tap flex h-9 w-9 items-center justify-center rounded-full border border-background/30 bg-background/10 hover:bg-background/20 transition-colors"
          aria-label="Toggle screen share"
          title="Screen share"
          disabled={callStatus !== "connected"}
        >
          <ScreenShare className="h-4 w-4" />
        </button>
        {/* Group calling isn't implemented yet (1:1 WebRTC only) - kept
            visible but permanently disabled with an honest label rather
            than a clickable no-op. */}
        <button
          className="tap flex h-9 w-9 items-center justify-center rounded-full border border-background/30 bg-background/10 opacity-40 cursor-not-allowed"
          aria-label="Add participant (not yet supported)"
          title="Group calls aren't supported yet"
          disabled
        >
          <UserPlus className="h-4 w-4" />
        </button>
        <button
          onClick={endCall}
          className="tap ml-1 flex h-9 items-center gap-1.5 rounded-full bg-background px-4 text-[12px] font-medium text-foreground hover:bg-background/90 transition-colors"
          aria-label="End call"
        >
          <PhoneOff className="h-4 w-4" />
          <span>End</span>
        </button>
      </div>
    </div>
  );
}

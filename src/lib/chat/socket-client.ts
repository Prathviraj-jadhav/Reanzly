"use client";
// Singleton socket.io client for the Reanzly chat service.
// The chat-store owns the lifecycle (connect on init, disconnect on logout);
// other modules import `getChatSocket()` only if they need to emit directly.
//
// Connection path is "/" with ?XTransformPort=3003 so the Caddy gateway
// forwards to the chat mini-service (port 3003). See Caddyfile.

import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
let connecting: Promise<Socket> | null = null;

export interface ChatSocketAuth {
  userId: string;
  userName: string;
  userRole: string;
  userInitials?: string;
}

export function getChatSocket(): Socket | null {
  return socket;
}

export function connectChatSocket(auth: ChatSocketAuth): Promise<Socket> {
  // If a socket already exists and is connected with the same user, reuse it.
  if (socket && socket.connected && (socket.auth as ChatSocketAuth)?.userId === auth.userId) {
    return Promise.resolve(socket);
  }
  // If a socket exists for a DIFFERENT user, tear it down first.
  if (socket && (socket.auth as ChatSocketAuth)?.userId !== auth.userId) {
    socket.disconnect();
    socket = null;
    connecting = null;
  }
  if (connecting) return connecting;

  connecting = new Promise<Socket>((resolve, reject) => {
    const s = io("/?XTransformPort=3003", {
      path: "/",
      transports: ["websocket", "polling"],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      auth,
    });
    s.on("connect", () => resolve(s));
    s.on("connect_error", (err) => {
      console.warn("[chat-socket] connect_error:", err.message);
    });
    s.io.on("reconnect", () => resolve(s));
    socket = s;
    setTimeout(() => resolve(s), 3000);
  });
  return connecting;
}

export function disconnectChatSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    connecting = null;
  }
}

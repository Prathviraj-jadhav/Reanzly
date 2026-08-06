"use client";
// Singleton socket.io client for the Reanzly chat service.
// The chat-store owns the lifecycle (connect on init, disconnect on logout);
// other modules import `getChatSocket()` only if they need to emit directly.
//
// Connection target depends on how the app is being served:
//   - Production (behind Caddy, see Caddyfile/Caddyfile.docker): the browser
//     only has one externally reachable port, so we use the same-origin path
//     "/?XTransformPort=3003" and let Caddy's @transform_port_query handler
//     reverse-proxy the WebSocket upgrade to the chat mini-service.
//   - Local dev (`next dev`, no Caddy in front of it): there is no gateway
//     listening on port 3000 to interpret XTransformPort, so that same path
//     just 404s against the Next.js dev server and the socket never connects.
//     We connect directly to the chat service's own port instead - it has
//     permissive CORS (see mini-services/chat-service/index.ts) specifically
//     to allow this.

import { io, Socket } from "socket.io-client";

const CHAT_SERVICE_PORT = process.env.NEXT_PUBLIC_CHAT_SERVICE_PORT || "3003";

function chatServiceUrl(): string {
  if (process.env.NODE_ENV === "production") {
    return `/?XTransformPort=${CHAT_SERVICE_PORT}`;
  }
  // Direct connection - same hostname as the page, chat service's own port.
  return `${window.location.protocol}//${window.location.hostname}:${CHAT_SERVICE_PORT}`;
}

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
    const s = io(chatServiceUrl(), {
      path: "/",
      transports: ["websocket", "polling"],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      // Sends the HttpOnly reanzly_session cookie along with the handshake -
      // this is what the server actually authenticates against now (see
      // chat-service's io.use() middleware). `auth` below is display-only
      // convenience, never trusted for identity.
      withCredentials: true,
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

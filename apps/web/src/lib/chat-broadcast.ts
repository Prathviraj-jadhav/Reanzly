/** Headers for Next.js → chat-service /internal/broadcast calls. */
export function chatInternalBroadcastHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const secret =
    process.env.CHAT_INTERNAL_SECRET ||
    process.env.INTERNAL_SERVICE_SECRET ||
    process.env.REANZLY_INTERNAL_SECRET;
  if (secret) headers["x-reanzly-internal-secret"] = secret;
  return headers;
}

export function chatServiceBaseUrl(): string {
  const port = process.env.CHAT_SERVICE_PORT || "3003";
  return process.env.CHAT_SERVICE_URL || `http://localhost:${port}`;
}

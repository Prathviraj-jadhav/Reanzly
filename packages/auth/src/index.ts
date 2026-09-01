export { hashPassword, verifyPassword } from "./password";
export {
  SESSION_COOKIE,
  SESSION_TTL_MS,
  sessionCookieOptions,
  type SessionCookieOptions,
} from "./cookie";
export {
  createSessionRecord,
  destroySessionByToken,
  getSessionUserByToken,
  getAuthContextByToken,
} from "./session";
export type { SessionUser, AuthContext, SessionRecord } from "./types";
export {
  AuthServiceError,
  legacyAuthErrorBody,
  v1AuthErrorBody,
  type AuthErrorCode,
} from "./errors";
export { sanitize } from "./sanitize";
export * from "./handlers/index";

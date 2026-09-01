export type AuthErrorCode =
  | "INVALID_CREDENTIALS"
  | "AUTH_REQUIRED"
  | "ACCOUNT_INACTIVE"
  | "VALIDATION_ERROR"
  | "RATE_LIMITED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_ERROR";

export class AuthServiceError extends Error {
  readonly code: AuthErrorCode;
  readonly status: number;

  constructor(code: AuthErrorCode, message: string, status: number) {
    super(message);
    this.name = "AuthServiceError";
    this.code = code;
    this.status = status;
  }
}

/** Legacy-compatible `{ error: string }` body used by both Next and v1 auth routes. */
export function legacyAuthErrorBody(error: AuthServiceError): { error: string } {
  return { error: error.message };
}

/** v1 envelope with explicit error code for API client consumers. */
export function v1AuthErrorBody(error: AuthServiceError): {
  error: { code: AuthErrorCode; message: string };
} {
  return { error: { code: error.code, message: error.message } };
}

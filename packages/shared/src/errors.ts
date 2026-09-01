import { ApiErrorEnvelopeSchema, type ApiErrorEnvelope } from "@reanzly/contracts";

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(status: number, envelope: ApiErrorEnvelope["error"]) {
    super(envelope.message);
    this.name = "ApiError";
    this.code = envelope.code;
    this.status = status;
    this.details = envelope.details;
  }
}

export function isApiErrorEnvelope(value: unknown): value is ApiErrorEnvelope {
  return ApiErrorEnvelopeSchema.safeParse(value).success;
}

export function parseApiError(status: number, body: unknown): ApiError {
  const parsed = ApiErrorEnvelopeSchema.safeParse(body);
  if (parsed.success) {
    return new ApiError(status, parsed.data.error);
  }
  return new ApiError(status, {
    code: "unknown_error",
    message: typeof body === "string" ? body : `Request failed with status ${status}`,
  });
}

import type { FastifyReply } from "fastify";
import { ZodError } from "zod";

export type DomainErrorCode =
  | "AUTH_REQUIRED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "CONFLICT";

export class DomainServiceError extends Error {
  readonly code: DomainErrorCode;
  readonly status: number;

  constructor(code: DomainErrorCode, message: string, status: number) {
    super(message);
    this.name = "DomainServiceError";
    this.code = code;
    this.status = status;
  }
}

export function v1ErrorBody(code: DomainErrorCode, message: string) {
  return { error: { code, message } };
}

export function legacyErrorBody(message: string) {
  return { error: message };
}

export function handleDomainRouteError(
  reply: FastifyReply,
  error: unknown,
  context: string,
  legacy = false,
) {
  if (error instanceof DomainServiceError) {
    const body = legacy ? legacyErrorBody(error.message) : v1ErrorBody(error.code, error.message);
    return reply.status(error.status).send(body);
  }
  if (error instanceof ZodError) {
    const svc = new DomainServiceError("VALIDATION_ERROR", "Invalid request.", 400);
    const body = legacy ? legacyErrorBody(svc.message) : v1ErrorBody(svc.code, svc.message);
    return reply.status(400).send(body);
  }
  const statusCode = (error as { statusCode?: number }).statusCode;
  if (statusCode === 401) {
    const message = "Not signed in.";
    if (legacy) return reply.status(401).send(legacyErrorBody(message));
    return reply.status(401).send(v1ErrorBody("AUTH_REQUIRED", message));
  }
  if (statusCode === 403) {
    const message = error instanceof Error ? error.message : "Forbidden.";
    if (legacy) return reply.status(403).send(legacyErrorBody(message));
    return reply.status(403).send(v1ErrorBody("FORBIDDEN", message));
  }
  reply.log.error({ err: error }, context);
  if (legacy) return reply.status(500).send(legacyErrorBody("Internal server error"));
  return reply.status(500).send({
    error: { code: "INTERNAL_ERROR", message: "Internal server error" },
  });
}

import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ApiErrorEnvelopeSchema } from "@reanzly/contracts";

export function registerErrorHandler(app: {
  setErrorHandler: (
    handler: (
      error: FastifyError,
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void> | void,
  ) => void;
}) {
  app.setErrorHandler((error, _request, reply) => {
    const statusCode = error.statusCode ?? 500;
    const envelope = ApiErrorEnvelopeSchema.parse({
      error: {
        code: error.code ?? "internal_error",
        message: statusCode >= 500 ? "Internal server error" : error.message,
      },
    });

    if (statusCode >= 500) {
      reply.log.error({ err: error }, "unhandled API error");
    }

    void reply.status(statusCode).send(envelope);
  });
}

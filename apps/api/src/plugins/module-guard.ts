import type { FastifyRequest } from "fastify";
import { hasModuleAccess, moduleAccessDeniedMessage } from "@reanzly/shared";
import { requireAuth } from "../plugins/auth.js";

export function requireModule(request: FastifyRequest, moduleId: string) {
  const auth = requireAuth(request);
  if (!hasModuleAccess(auth.role, moduleId)) {
    const err = new Error(moduleAccessDeniedMessage()) as Error & {
      statusCode: number;
      code: string;
    };
    err.statusCode = 403;
    err.code = "FORBIDDEN";
    throw err;
  }
  return auth;
}

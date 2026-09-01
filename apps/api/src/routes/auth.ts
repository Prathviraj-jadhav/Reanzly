import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { db } from "@reanzly/database";
import {
  AuthServiceError,
  createSessionRecord,
  destroySessionByToken,
  loginUser,
  signupOwner,
  signupDriver,
  signupBroker,
  signupShipper,
  getProfile,
  patchProfile,
  switchRole,
  forgotPassword,
  legacyAuthErrorBody,
  v1AuthErrorBody,
} from "@reanzly/auth";
import {
  LoginRequestSchema,
  LoginResponseSchema,
  MeResponseSchema,
  LogoutResponseSchema,
  ProfilePatchSchema,
  ProfileResponseSchema,
  SignupRequestSchema,
  SignupDriverRequestSchema,
  SignupBrokerRequestSchema,
  SignupShipperRequestSchema,
  SwitchRoleRequestSchema,
  ForgotPasswordRequestSchema,
  AuthSignupResponseSchema,
} from "@reanzly/contracts";
import { checkRateLimit } from "../lib/rate-limit.js";
import {
  parseSessionCookie,
  requireAuth,
  resolveRequestAuth,
} from "../plugins/auth.js";
import { clearSessionCookieHeader, setSessionCookieHeader } from "../lib/session-cookie.js";

function sendAuthError(reply: FastifyReply, error: AuthServiceError, legacy = false) {
  const body = legacy ? legacyAuthErrorBody(error) : v1AuthErrorBody(error);
  return reply.status(error.status).send(body);
}

function handleRouteError(reply: FastifyReply, error: unknown, context: string, legacy = false) {
  if (error instanceof AuthServiceError) return sendAuthError(reply, error, legacy);
  if (error instanceof ZodError) {
    return sendAuthError(
      reply,
      new AuthServiceError("VALIDATION_ERROR", "Invalid request.", 400),
      legacy,
    );
  }
  const statusCode = (error as { statusCode?: number }).statusCode;
  if (statusCode === 401) {
    if (legacy) return reply.status(401).send({ error: "Not signed in." });
    return reply.status(401).send(
      v1AuthErrorBody(new AuthServiceError("AUTH_REQUIRED", "Not signed in.", 401)),
    );
  }
  if (statusCode === 403) {
    const message = error instanceof Error ? error.message : "Forbidden.";
    if (legacy) return reply.status(403).send({ error: message });
    return reply.status(403).send(
      v1AuthErrorBody(new AuthServiceError("FORBIDDEN", message, 403)),
    );
  }
  return handleUnexpected(reply, error, context);
}

function handleUnexpected(reply: FastifyReply, error: unknown, context: string) {
  reply.log.error({ err: error }, context);
  const svc = new AuthServiceError("INTERNAL_ERROR", "Internal server error", 500);
  return sendAuthError(reply, svc);
}

function enforceRateLimit(
  request: FastifyRequest,
  reply: FastifyReply,
  opts: { limit: number; window: number },
): boolean {
  const result = checkRateLimit(request.headers, opts);
  if (!result.allowed) {
    void reply
      .status(429)
      .header("Retry-After", String(result.retryAfterSec))
      .send(
        v1AuthErrorBody(
          new AuthServiceError("RATE_LIMITED", "Rate limit exceeded. Please retry shortly.", 429),
        ),
      );
    return false;
  }
  return true;
}

export async function authRoutes(app: FastifyInstance) {
  const isProduction = process.env.NODE_ENV === "production";

  app.addHook("preHandler", async (request) => {
    request.auth = await resolveRequestAuth(request);
  });

  app.post("/v1/auth/login", async (request, reply) => {
    if (!enforceRateLimit(request, reply, { limit: 10, window: 60_000 })) return;
    try {
      const body = LoginRequestSchema.parse(request.body);
      const result = await loginUser(db, body);
      const { token, expiresAt } = await createSessionRecord(db, result.userId);
      setSessionCookieHeader(reply, token, expiresAt, isProduction);
      const payload = LoginResponseSchema.parse({ user: result.user });
      return reply.send(payload);
    } catch (error) {
      return handleRouteError(reply, error, "login failed");
    }
  });

  app.post("/v1/auth/logout", async (request, reply) => {
    try {
      const token = parseSessionCookie(request);
      if (token) await destroySessionByToken(db, token);
      clearSessionCookieHeader(reply, isProduction);
      return reply.send(LogoutResponseSchema.parse({ ok: true }));
    } catch (error) {
      return handleUnexpected(reply, error, "logout failed");
    }
  });

  app.get("/v1/auth/me", async (request, reply) => {
    if (!request.auth) {
      return reply.status(401).send(MeResponseSchema.parse({ user: null }));
    }
    return reply.send(
      MeResponseSchema.parse({
        user: {
          id: request.auth.id,
          companyId: request.auth.companyId,
          email: request.auth.email,
          name: request.auth.name,
          role: request.auth.role,
        },
      }),
    );
  });

  app.get("/v1/auth/profile", async (request, reply) => {
    try {
      const auth = requireAuth(request);
      const profile = await getProfile(db, auth.id);
      return reply.send(ProfileResponseSchema.parse({ profile }));
    } catch (error) {
      return handleRouteError(reply, error, "profile get failed", true);
    }
  });

  app.patch("/v1/auth/profile", async (request, reply) => {
    try {
      const auth = requireAuth(request);
      const body = ProfilePatchSchema.parse(request.body);
      const profile = await patchProfile(db, auth.id, body);
      return reply.send(ProfileResponseSchema.parse({ profile }));
    } catch (error) {
      if ((error as { statusCode?: number }).statusCode === 401) {
        return reply.status(401).send({ error: "Not signed in." });
      }
      return handleRouteError(reply, error, "profile patch failed", true);
    }
  });

  app.post("/v1/auth/signup", async (request, reply) => {
    if (!enforceRateLimit(request, reply, { limit: 10, window: 60_000 })) return;
    try {
      const body = SignupRequestSchema.parse(request.body);
      const result = await signupOwner(db, body);
      const { token, expiresAt } = await createSessionRecord(db, result.userId);
      setSessionCookieHeader(reply, token, expiresAt, isProduction);
      return reply.send(AuthSignupResponseSchema.parse({ user: result.user }));
    } catch (error) {
      return handleRouteError(reply, error, "signup failed", true);
    }
  });

  app.post("/v1/auth/signup-driver", async (request, reply) => {
    if (!enforceRateLimit(request, reply, { limit: 10, window: 60_000 })) return;
    try {
      const body = SignupDriverRequestSchema.parse(request.body);
      const result = await signupDriver(db, body);
      const { token, expiresAt } = await createSessionRecord(db, result.userId);
      setSessionCookieHeader(reply, token, expiresAt, isProduction);
      return reply.send(AuthSignupResponseSchema.parse({ user: result.user }));
    } catch (error) {
      return handleRouteError(reply, error, "signup-driver failed", true);
    }
  });

  app.post("/v1/auth/signup-broker", async (request, reply) => {
    if (!enforceRateLimit(request, reply, { limit: 10, window: 60_000 })) return;
    try {
      const body = SignupBrokerRequestSchema.parse(request.body);
      const result = await signupBroker(db, body);
      const { token, expiresAt } = await createSessionRecord(db, result.userId);
      setSessionCookieHeader(reply, token, expiresAt, isProduction);
      return reply.send(AuthSignupResponseSchema.parse({ user: result.user }));
    } catch (error) {
      return handleRouteError(reply, error, "signup-broker failed", true);
    }
  });

  app.post("/v1/auth/signup-shipper", async (request, reply) => {
    if (!enforceRateLimit(request, reply, { limit: 10, window: 60_000 })) return;
    try {
      const body = SignupShipperRequestSchema.parse(request.body);
      const result = await signupShipper(db, body);
      const { token, expiresAt } = await createSessionRecord(db, result.userId);
      setSessionCookieHeader(reply, token, expiresAt, isProduction);
      return reply.send(AuthSignupResponseSchema.parse({ user: result.user }));
    } catch (error) {
      return handleRouteError(reply, error, "signup-shipper failed", true);
    }
  });

  app.post("/v1/auth/switch-role", async (request, reply) => {
    try {
      const auth = requireAuth(request);
      const body = SwitchRoleRequestSchema.parse(request.body);
      const result = await switchRole(db, auth, body.roleId);
      const oldToken = parseSessionCookie(request);
      if (oldToken) await destroySessionByToken(db, oldToken);
      const { token, expiresAt } = await createSessionRecord(db, result.userId);
      setSessionCookieHeader(reply, token, expiresAt, isProduction);
      return reply.send(AuthSignupResponseSchema.parse({ user: result.user }));
    } catch (error) {
      if ((error as { statusCode?: number }).statusCode === 401) {
        return reply.status(401).send({ error: "Not signed in." });
      }
      return handleRouteError(reply, error, "switch-role failed", true);
    }
  });

  app.post("/v1/auth/forgot-password", async (request, reply) => {
    if (!enforceRateLimit(request, reply, { limit: 5, window: 60_000 })) return;
    try {
      const body = ForgotPasswordRequestSchema.parse(request.body);
      const result = await forgotPassword(db, body);
      return reply.send(result);
    } catch (error) {
      return handleRouteError(reply, error, "forgot-password failed", true);
    }
  });
}

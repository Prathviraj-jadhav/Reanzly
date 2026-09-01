import { api } from "@/lib/api-client";
import { ApiError, type ApiRequestOptions } from "@reanzly/shared";
import {
  LoginResponseSchema,
  MeResponseSchema,
  LogoutResponseSchema,
  ProfileResponseSchema,
  AuthSignupResponseSchema,
  type LoginResponse,
  type MeResponse,
} from "@reanzly/contracts";

const AUTH_DOMAIN = "auth" as const;

export function authErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  return fallback;
}

export async function authLogin(
  email: string,
  password: string,
  options?: ApiRequestOptions,
): Promise<LoginResponse> {
  const body = await api<unknown>("auth/login", {
    domain: AUTH_DOMAIN,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    ...options,
  });
  return LoginResponseSchema.parse(body);
}

export async function authLogout(options?: ApiRequestOptions): Promise<void> {
  await api("auth/logout", {
    domain: AUTH_DOMAIN,
    method: "POST",
    ...options,
  });
  LogoutResponseSchema.parse({ ok: true });
}

export async function authMe(options?: ApiRequestOptions): Promise<MeResponse> {
  const body = await api<unknown>("auth/me", { domain: AUTH_DOMAIN, ...options });
  return MeResponseSchema.parse(body);
}

export async function authGetProfile(options?: ApiRequestOptions) {
  const body = await api<unknown>("auth/profile", { domain: AUTH_DOMAIN, ...options });
  return ProfileResponseSchema.parse(body);
}

export async function authPatchProfile(
  patch: object,
  options?: ApiRequestOptions,
) {
  const body = await api<unknown>("auth/profile", {
    domain: AUTH_DOMAIN,
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
    ...options,
  });
  return ProfileResponseSchema.parse(body);
}

export async function authSignup(payload: Record<string, unknown>, options?: ApiRequestOptions) {
  const body = await api<unknown>("auth/signup", {
    domain: AUTH_DOMAIN,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    ...options,
  });
  return AuthSignupResponseSchema.parse(body);
}

export async function authSignupDriver(payload: Record<string, unknown>, options?: ApiRequestOptions) {
  const body = await api<unknown>("auth/signup-driver", {
    domain: AUTH_DOMAIN,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    ...options,
  });
  return AuthSignupResponseSchema.parse(body);
}

export async function authSignupShipper(payload: Record<string, unknown>, options?: ApiRequestOptions) {
  const body = await api<unknown>("auth/signup-shipper", {
    domain: AUTH_DOMAIN,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    ...options,
  });
  return AuthSignupResponseSchema.parse(body);
}

export async function authSignupBroker(payload: Record<string, unknown>, options?: ApiRequestOptions) {
  const body = await api<unknown>("auth/signup-broker", {
    domain: AUTH_DOMAIN,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    ...options,
  });
  return AuthSignupResponseSchema.parse(body);
}

export async function authSwitchRole(roleId: string, options?: ApiRequestOptions) {
  const body = await api<unknown>("auth/switch-role", {
    domain: AUTH_DOMAIN,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roleId }),
    ...options,
  });
  return AuthSignupResponseSchema.parse(body);
}

export async function authForgotPassword(
  email: string,
  newPassword?: string,
  options?: ApiRequestOptions,
) {
  return api<{ success: boolean; message: string }>("auth/forgot-password", {
    domain: AUTH_DOMAIN,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, newPassword }),
    ...options,
  });
}

import { HealthResponseSchema, type HealthResponse } from "@reanzly/contracts";
import { parseApiError } from "./errors";

export type ApiDomain = "health" | "auth" | (string & {});

export type ApiRequestOptions = Omit<RequestInit, "credentials"> & {
  /** API routing domain; defaults to legacy `/api/*`. */
  domain?: ApiDomain;
};

function resolveAuthVersion(): "v1" | "legacy" {
  const flag = process.env.NEXT_PUBLIC_AUTH_API_VERSION ?? process.env.REANZLY_AUTH_API_VERSION ?? "v1";
  return flag === "legacy" ? "legacy" : "v1";
}

function resolvePilotDomainVersion(domain: string): "v1" | "legacy" {
  const envKey = domain.toUpperCase().replace(/-/g, "_");
  const flag =
    process.env[`NEXT_PUBLIC_${envKey}_API_VERSION`] ??
    process.env[`REANZLY_${envKey}_API_VERSION`] ??
    "v1";
  return flag === "legacy" ? "legacy" : "v1";
}

const DOMAIN_VERSION: Record<string, "v1" | "legacy"> = {
  health: "v1",
  get auth() {
    return resolveAuthVersion();
  },
  get reminders() {
    return resolvePilotDomainVersion("reminders");
  },
  get knowledge() {
    return resolvePilotDomainVersion("knowledge");
  },
  get helpdesk() {
    return resolvePilotDomainVersion("helpdesk");
  },
  get warehouse() {
    return resolvePilotDomainVersion("warehouse");
  },
};

function resolveApiUrl(path: string, domain: ApiDomain = "legacy"): string {
  const version = DOMAIN_VERSION[domain] ?? "legacy";
  const normalized = path.replace(/^\/+/, "");
  const publicBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "");

  if (publicBase) {
    if (version === "v1") {
      return `${publicBase}/v1/${normalized}`;
    }
    return `${publicBase}/${normalized}`;
  }

  if (version === "v1") {
    return `/api/v1/${normalized}`;
  }
  return `/api/${normalized}`;
}

/**
 * Thin HTTP client for Reanzly APIs.
 * v1 domains proxy to Fastify; legacy domains stay on Next.js route handlers.
 */
export async function api<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { domain = "legacy", headers, ...init } = options;
  const url = resolveApiUrl(path, domain);

  const response = await fetch(url, {
    ...init,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...headers,
    },
  });

  const contentType = response.headers.get("content-type") ?? "";
  const body =
    contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    throw parseApiError(response.status, body);
  }

  return body as T;
}

/** Liveness probe via the v1 Fastify health endpoint (proxied through Next.js in dev). */
export async function checkApiHealth(): Promise<HealthResponse> {
  const body = await api<unknown>("health", { domain: "health" });
  return HealthResponseSchema.parse(body);
}

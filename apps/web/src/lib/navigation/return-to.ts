import { DASHBOARD_ROUTE } from "./routing-config";

/**
 * Validates a post-login return URL. Rejects open redirects and external targets.
 * Only same-origin relative paths starting with `/` (but not `//`) are allowed.
 */
export function validateReturnTo(
  value: string | null | undefined,
  fallback: string = DASHBOARD_ROUTE,
): string {
  if (!value || typeof value !== "string") return fallback;

  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return fallback;
  if (trimmed.includes("://") || trimmed.includes("\\") || trimmed.includes("@")) {
    return fallback;
  }

  // Allow internal path characters only (incl. query string for future deep links).
  if (!/^\/[\w\-./?=&%]*$/.test(trimmed)) return fallback;

  return trimmed;
}

export function buildLoginUrl(returnTo?: string): string {
  const safe = validateReturnTo(returnTo, DASHBOARD_ROUTE);
  const params = new URLSearchParams({ returnTo: safe });
  return `/login?${params.toString()}`;
}

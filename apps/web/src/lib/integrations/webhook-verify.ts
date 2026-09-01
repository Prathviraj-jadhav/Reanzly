import { createHmac, timingSafeEqual } from "crypto";
import { hmacSha256Hex } from "@/lib/api-guards";

export type WebhookVerifyResult =
  | { ok: true; eventType?: string }
  | { ok: false; reason: string };

export interface WebhookVerifier {
  verify(headers: Record<string, string>, rawBody: string): WebhookVerifyResult;
}

function envWebhookSecret(providerId: string): string | undefined {
  const upper = providerId.toUpperCase().replace(/-/g, "_");
  return (
    process.env[`WEBHOOK_SECRET_${upper}`] ||
    process.env[`INTEGRATION_WEBHOOK_SECRET_${upper}`] ||
    undefined
  );
}

function compareDigest(provided: string, expected: string): boolean {
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** HMAC-SHA256 with hex digest — used by test provider and several Indian gateways. */
function hmacVerifier(providerId: string): WebhookVerifier {
  return {
    verify(headers, rawBody) {
      const secret = envWebhookSecret(providerId);
      if (!secret) return { ok: false, reason: "webhook secret not configured" };
      const signature =
        headers[`x-${providerId}-signature`] ||
        headers["x-signature"] ||
        headers["x-webhook-signature"] ||
        "";
      if (!signature) return { ok: false, reason: "missing signature" };
      const expected = hmacSha256Hex(secret, rawBody);
      if (!compareDigest(signature, expected)) {
        return { ok: false, reason: "invalid signature" };
      }
      return {
        ok: true,
        eventType: headers[`x-${providerId}-event`] || headers["x-event-type"] || "verified",
      };
    },
  };
}

/** Stripe-style v1 signatures: t=timestamp,v1=hex */
const stripeVerifier: WebhookVerifier = {
  verify(headers, rawBody) {
    const secret = envWebhookSecret("stripe") || envWebhookSecret("STRIPE");
    if (!secret) return { ok: false, reason: "webhook secret not configured" };
    const header = headers["stripe-signature"] || "";
    if (!header) return { ok: false, reason: "missing signature" };
    const parts = Object.fromEntries(
      header.split(",").map((p) => {
        const [k, v] = p.split("=");
        return [k, v];
      }),
    );
    const timestamp = parts.t;
    const v1 = parts.v1;
    if (!timestamp || !v1) return { ok: false, reason: "invalid signature format" };
    const signed = `${timestamp}.${rawBody}`;
    const expected = createHmac("sha256", secret).update(signed, "utf8").digest("hex");
    if (!compareDigest(v1, expected)) return { ok: false, reason: "invalid signature" };
    return { ok: true, eventType: headers["x-event-type"] || "stripe.event" };
  },
};

const REGISTRY: Record<string, WebhookVerifier> = {
  test: hmacVerifier("test"),
  razorpay: hmacVerifier("razorpay"),
  payu: hmacVerifier("payu"),
  cashfree: hmacVerifier("cashfree"),
  phonepe: hmacVerifier("phonepe"),
  msg91: hmacVerifier("msg91"),
  twilio: hmacVerifier("twilio"),
  stripe: stripeVerifier,
};

export function getWebhookVerifier(providerId: string): WebhookVerifier | null {
  return REGISTRY[providerId] ?? null;
}

export function verifyWebhookSignature(
  providerId: string,
  headers: Record<string, string>,
  rawBody: string,
): WebhookVerifyResult {
  const verifier = getWebhookVerifier(providerId);
  if (!verifier) {
    // Unknown providers: require a configured generic secret if present.
    const generic = envWebhookSecret(providerId);
    if (!generic) return { ok: false, reason: "no verifier for provider" };
    return hmacVerifier(providerId).verify(headers, rawBody);
  }
  return verifier.verify(headers, rawBody);
}

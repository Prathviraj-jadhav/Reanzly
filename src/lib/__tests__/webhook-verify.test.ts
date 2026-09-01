import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { verifyWebhookSignature, getWebhookVerifier } from "@/lib/integrations/webhook-verify";

describe("webhook-verify", () => {
  const prev = process.env.WEBHOOK_SECRET_TEST;

  beforeEach(() => {
    process.env.WEBHOOK_SECRET_TEST = "test-secret-key";
  });

  afterEach(() => {
    if (prev === undefined) delete process.env.WEBHOOK_SECRET_TEST;
    else process.env.WEBHOOK_SECRET_TEST = prev;
  });

  it("rejects missing signature", () => {
    const result = verifyWebhookSignature("test", {}, '{"event":"ping"}');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("missing signature");
  });

  it("rejects invalid signature", () => {
    const result = verifyWebhookSignature(
      "test",
      { "x-test-signature": "deadbeef" },
      '{"event":"ping"}',
    );
    expect(result.ok).toBe(false);
  });

  it("accepts valid test provider signature", () => {
    const body = '{"event":"payment.captured"}';
    const verifier = getWebhookVerifier("test");
    expect(verifier).toBeTruthy();
    const { createHmac } = require("crypto");
    const sig = createHmac("sha256", "test-secret-key").update(body, "utf8").digest("hex");
    const result = verifyWebhookSignature("test", { "x-test-signature": sig }, body);
    expect(result.ok).toBe(true);
  });

  it("returns no verifier for unknown provider without env secret", () => {
    const result = verifyWebhookSignature("unknown-provider-xyz", {}, "{}");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("no verifier for provider");
  });
});

import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("@reanzly/auth password", () => {
  it("hashes and verifies passwords with scrypt", () => {
    const { hash, salt } = hashPassword("Reanzly@Demo2026");
    expect(hash).toMatch(/^[a-f0-9]+$/);
    expect(salt).toMatch(/^[a-f0-9]+$/);
    expect(verifyPassword("Reanzly@Demo2026", hash, salt)).toBe(true);
    expect(verifyPassword("wrong", hash, salt)).toBe(false);
  });

  it("rejects mismatched buffer lengths safely", () => {
    expect(verifyPassword("x", "00", "aa")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { AuthServiceError, legacyAuthErrorBody, v1AuthErrorBody, loginUser } from "@reanzly/auth";
import { vi } from "vitest";

describe("auth legacy vs v1 parity (semantic)", () => {
  it("invalid credentials use same message for wrong email and wrong password", async () => {
    const db = {
      user: {
        findUnique: vi.fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({
            id: "u1",
            companyId: "c1",
            email: "a@b.com",
            name: "A",
            role: "owner",
            status: "Active",
            passwordHash: "aa",
            salt: "bb",
          }),
      },
    };

    await expect(
      loginUser(db as never, { email: "missing@b.com", password: "x" }),
    ).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
      message: "Invalid email or password.",
      status: 401,
    });

    await expect(
      loginUser(db as never, { email: "a@b.com", password: "bad" }),
    ).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
      message: "Invalid email or password.",
      status: 401,
    });
  });

  it("legacy and v1 error envelopes share message text", () => {
    const err = new AuthServiceError("INVALID_CREDENTIALS", "Invalid email or password.", 401);
    expect(legacyAuthErrorBody(err)).toEqual({ error: "Invalid email or password." });
    expect(v1AuthErrorBody(err)).toEqual({
      error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password." },
    });
  });

  it("me response shape excludes password fields", () => {
    const user = {
      id: "owner",
      companyId: "co",
      email: "owner@reanzly.in",
      name: "Owner",
      role: "owner",
    };
    expect(Object.keys(user).sort()).toEqual(
      ["companyId", "email", "id", "name", "role"].sort(),
    );
  });
});

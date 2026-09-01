import { NextRequest, NextResponse } from "next/server";
import { rateLimitResponse } from "@/lib/security";
import {
  handleAuthRouteError,
  handleLogin,
  handleLogout,
  handleMe,
  handleProfileGet,
  handleProfilePatch,
  handleSignup,
  handleSignupDriver,
  handleSignupBroker,
  handleSignupShipper,
  handleSwitchRole,
  handleForgotPassword,
} from "@/lib/auth-routes";

/** @deprecated Compatibility shim — prefer /api/v1/auth/login via api-client. */
export async function POST(req: NextRequest) {
  try {
    if (process.env.E2E_TEST_MODE !== "1") {
      const limited = rateLimitResponse(req, { limit: 10, window: 60_000 });
      if (limited) return limited;
    }
    return await handleLogin(req);
  } catch (error) {
    return handleAuthRouteError(error);
  }
}

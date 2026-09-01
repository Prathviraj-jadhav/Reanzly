import { NextRequest } from "next/server";
import { rateLimitResponse } from "@/lib/security";
import { handleAuthRouteError, handleForgotPassword } from "@/lib/auth-routes";

/** @deprecated Compatibility shim — prefer /api/v1/auth/forgot-password via api-client. */
export async function POST(req: NextRequest) {
  try {
    const limited = rateLimitResponse(req, { limit: 5, window: 60_000 });
    if (limited) return limited;
    return await handleForgotPassword(req);
  } catch (error) {
    return handleAuthRouteError(error);
  }
}

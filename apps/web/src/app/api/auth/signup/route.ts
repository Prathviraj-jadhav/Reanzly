import { NextRequest } from "next/server";
import { rateLimitResponse } from "@/lib/security";
import { handleAuthRouteError, handleSignup } from "@/lib/auth-routes";

/** @deprecated Compatibility shim — prefer /api/v1/auth/signup via api-client. */
export async function POST(req: NextRequest) {
  try {
    const limited = rateLimitResponse(req, { limit: 10, window: 60_000 });
    if (limited) return limited;
    return await handleSignup(req);
  } catch (error) {
    return handleAuthRouteError(error, "Internal Server Error. Please contact Reanzly support.");
  }
}

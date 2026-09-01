import { NextRequest } from "next/server";
import { handleAuthRouteError, handleProfileGet, handleProfilePatch } from "@/lib/auth-routes";

/** @deprecated Compatibility shim — prefer /api/v1/auth/profile via api-client. */
export async function GET() {
  try {
    return await handleProfileGet();
  } catch (error) {
    return handleAuthRouteError(error);
  }
}

/** @deprecated Compatibility shim — prefer /api/v1/auth/profile via api-client. */
export async function PATCH(req: NextRequest) {
  try {
    return await handleProfilePatch(req);
  } catch (error) {
    return handleAuthRouteError(error);
  }
}

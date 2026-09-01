import { NextRequest } from "next/server";
import { handleAuthRouteError, handleSwitchRole } from "@/lib/auth-routes";

/** @deprecated Compatibility shim — prefer /api/v1/auth/switch-role via api-client. */
export async function POST(req: NextRequest) {
  try {
    return await handleSwitchRole(req);
  } catch (error) {
    return handleAuthRouteError(error);
  }
}

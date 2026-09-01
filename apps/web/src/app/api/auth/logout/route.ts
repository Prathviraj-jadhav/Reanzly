import { handleAuthRouteError, handleLogout } from "@/lib/auth-routes";

/** @deprecated Compatibility shim — prefer /api/v1/auth/logout via api-client. */
export async function POST() {
  try {
    return await handleLogout();
  } catch (error) {
    return handleAuthRouteError(error);
  }
}

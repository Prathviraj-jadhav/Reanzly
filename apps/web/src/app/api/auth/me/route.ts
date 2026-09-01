import { handleAuthRouteError, handleMe } from "@/lib/auth-routes";

/** @deprecated Compatibility shim — prefer /api/v1/auth/me via api-client. */
export async function GET() {
  try {
    return await handleMe();
  } catch (error) {
    return handleAuthRouteError(error);
  }
}

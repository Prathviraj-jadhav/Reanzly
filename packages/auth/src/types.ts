/** Narrow identity shape used for session auth checks across the platform. */
export interface SessionUser {
  id: string;
  companyId: string;
  email: string;
  name: string;
  role: string;
}

/** Extended request auth context for Fastify guards and scoped APIs. */
export interface AuthContext extends SessionUser {
  branchId?: string | null;
  customerId?: string | null;
  brokerProfileId?: string | null;
  driverId?: string | null;
}

export interface SessionRecord {
  token: string;
  expiresAt: Date;
}

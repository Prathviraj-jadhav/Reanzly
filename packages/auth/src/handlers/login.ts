import type { PrismaClient } from "@prisma/client";
import { verifyPassword } from "../password";
import { sanitize } from "../sanitize";
import { AuthServiceError } from "../errors";
import type { SessionUser } from "../types";

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResult {
  user: SessionUser;
  userId: string;
}

export async function loginUser(db: PrismaClient, input: LoginInput): Promise<LoginResult> {
  const email = sanitize(input.email, 200).toLowerCase();
  const password = input.password;

  if (!email || !password) {
    throw new AuthServiceError("VALIDATION_ERROR", "Email and password are required.", 400);
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash || !user.salt || !verifyPassword(password, user.passwordHash, user.salt)) {
    throw new AuthServiceError("INVALID_CREDENTIALS", "Invalid email or password.", 401);
  }
  if (user.status !== "Active") {
    throw new AuthServiceError("ACCOUNT_INACTIVE", "This account is not active.", 403);
  }

  await db.user.update({ where: { id: user.id }, data: { lastActive: new Date() } });

  return {
    userId: user.id,
    user: {
      id: user.id,
      companyId: user.companyId,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  };
}

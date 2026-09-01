import type { PrismaClient } from "@prisma/client";
import { hashPassword } from "../password";
import { sanitize } from "../sanitize";
import { AuthServiceError } from "../errors";

export async function forgotPassword(
  db: PrismaClient,
  raw: { email: string; newPassword?: string },
): Promise<{ success: true; message: string }> {
  const email = sanitize(raw.email, 200).toLowerCase().trim();
  const newPassword = raw.newPassword ? String(raw.newPassword) : "Reanzly@Demo2026";

  if (!email) {
    throw new AuthServiceError("VALIDATION_ERROR", "Work email is required.", 400);
  }
  if (newPassword.length < 4) {
    throw new AuthServiceError("VALIDATION_ERROR", "Password needs at least 4 characters.", 400);
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    throw new AuthServiceError("NOT_FOUND", "No account found with this email.", 404);
  }

  const { hash, salt } = hashPassword(newPassword);
  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: hash, salt },
  });

  return {
    success: true,
    message: `Password has been reset successfully to: ${newPassword}`,
  };
}

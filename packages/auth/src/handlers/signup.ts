import type { PrismaClient } from "@prisma/client";
import { hashPassword } from "../password";
import { sanitize } from "../sanitize";
import { AuthServiceError } from "../errors";
import type { SessionUser } from "../types";

export interface SignupInput {
  workEmail: string;
  password: string;
  companyName: string;
  contactName: string;
  phone?: string;
  roleChoice?: string;
  gstin?: string;
  registeredState?: string;
}

export async function signupOwner(db: PrismaClient, raw: SignupInput): Promise<{ user: SessionUser; userId: string }> {
  const email = sanitize(raw.workEmail, 200).toLowerCase().trim();
  const password = raw.password;
  const companyName = sanitize(raw.companyName, 200).trim();
  const contactName = sanitize(raw.contactName, 200).trim();
  const phone = sanitize(raw.phone ?? "", 20).trim();
  const roleChoice = sanitize(raw.roleChoice ?? "owner", 50);
  const gstin = sanitize(raw.gstin ?? "", 15).toUpperCase().trim();
  const registeredState = sanitize(raw.registeredState ?? "", 100);

  if (!email || !password || !companyName || !contactName) {
    throw new AuthServiceError("VALIDATION_ERROR", "Missing required onboarding fields.", 400);
  }

  const existingUser = await db.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new AuthServiceError("CONFLICT", "An account with this email already exists.", 409);
  }

  const company = await db.company.create({
    data: {
      legalName: companyName,
      tradeName: companyName,
      gstin: gstin || `GST-TEMP-${Date.now().toString(36).toUpperCase()}`,
      state: registeredState,
      phone,
      email,
      status: "Active",
    },
  });

  const { hash, salt } = hashPassword(password);
  const user = await db.user.create({
    data: {
      companyId: company.id,
      email,
      name: contactName,
      role: roleChoice,
      status: "Active",
      phone,
      passwordHash: hash,
      salt,
    },
  });

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

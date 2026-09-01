import type { PrismaClient } from "@prisma/client";
import { AuthServiceError } from "../errors";
import type { SessionUser } from "../types";

export const PROFILE_EDITABLE_FIELDS = [
  "name",
  "phone",
  "altEmail",
  "altPhone",
  "dob",
  "gender",
  "address",
  "jobTitle",
  "department",
  "reportingManager",
  "language",
  "timezone",
] as const;

export type ProfileEditableField = (typeof PROFILE_EDITABLE_FIELDS)[number];

export interface ProfileDto {
  name: string;
  email: string;
  altEmail: string;
  phone: string;
  altPhone: string;
  dob: string;
  gender: string;
  address: string;
  jobTitle: string;
  department: string;
  reportingManager: string;
  language: string;
  timezone: string;
}

function toProfileDto(user: {
  name: string;
  email: string;
  altEmail: string | null;
  phone: string | null;
  altPhone: string | null;
  dob: Date | null;
  gender: string | null;
  address: string | null;
  jobTitle: string | null;
  department: string | null;
  reportingManager: string | null;
  language: string | null;
  timezone: string | null;
}): ProfileDto {
  return {
    name: user.name,
    email: user.email,
    altEmail: user.altEmail ?? "",
    phone: user.phone ?? "",
    altPhone: user.altPhone ?? "",
    dob: user.dob ? user.dob.toISOString().slice(0, 10) : "",
    gender: user.gender ?? "",
    address: user.address ?? "",
    jobTitle: user.jobTitle ?? "",
    department: user.department ?? "",
    reportingManager: user.reportingManager ?? "",
    language: user.language ?? "",
    timezone: user.timezone ?? "",
  };
}

export async function getProfile(db: PrismaClient, userId: string): Promise<ProfileDto> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AuthServiceError("NOT_FOUND", "User not found.", 404);
  }
  return toProfileDto(user);
}

export async function patchProfile(
  db: PrismaClient,
  userId: string,
  body: Record<string, unknown>,
): Promise<ProfileDto> {
  const data: Record<string, string | Date | null> = {};

  for (const field of PROFILE_EDITABLE_FIELDS) {
    if (!(field in body)) continue;
    const raw = String(body[field] ?? "").trim();
    if (field === "dob") {
      data.dob = raw ? new Date(raw) : null;
    } else if (field === "name") {
      if (!raw) {
        throw new AuthServiceError("VALIDATION_ERROR", "Name cannot be empty.", 400);
      }
      data.name = raw;
    } else {
      data[field] = raw || null;
    }
  }

  const updated = await db.user.update({ where: { id: userId }, data });
  return toProfileDto(updated);
}

export async function switchRole(
  db: PrismaClient,
  sessionUser: SessionUser,
  roleId: string,
): Promise<{ user: SessionUser; userId: string }> {
  if (!roleId) {
    throw new AuthServiceError("VALIDATION_ERROR", "roleId is required.", 400);
  }
  if (sessionUser.role !== "owner" && sessionUser.role !== "superadmin") {
    throw new AuthServiceError(
      "FORBIDDEN",
      "Only an owner or platform admin can switch demo roles.",
      403,
    );
  }

  const target = await db.user.findUnique({ where: { id: roleId } });
  if (!target || target.companyId !== sessionUser.companyId) {
    throw new AuthServiceError("NOT_FOUND", "That demo role has no seeded account.", 404);
  }
  if (target.status !== "Active") {
    throw new AuthServiceError("ACCOUNT_INACTIVE", "This account is not active.", 403);
  }
  if (sessionUser.role === "owner" && target.role === "superadmin") {
    throw new AuthServiceError(
      "FORBIDDEN",
      "Tenant owners cannot switch into the platform admin account.",
      403,
    );
  }

  await db.user.update({ where: { id: target.id }, data: { lastActive: new Date() } });

  return {
    userId: target.id,
    user: {
      id: target.id,
      companyId: target.companyId,
      email: target.email,
      name: target.name,
      role: target.role,
    },
  };
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { COMPANY_ID } from "../backups/_lib";
import { requireSuperadmin } from "@/lib/permissions";

function toDTO(s: {
  dailyEnabled: boolean; dailyTime: string; weeklyFullEnabled: boolean; weeklyDay: string;
  retentionDays: number; storageCapGB: number;
}) {
  return {
    dailyEnabled: s.dailyEnabled,
    dailyTime: s.dailyTime,
    weeklyFullEnabled: s.weeklyFullEnabled,
    weeklyDay: s.weeklyDay,
    retentionDays: s.retentionDays,
    storageCapGB: s.storageCapGB,
  };
}

async function getOrCreateSchedule() {
  const existing = await db.backupSchedule.findUnique({ where: { companyId: COMPANY_ID } });
  if (existing) return existing;
  return db.backupSchedule.create({ data: { companyId: COMPANY_ID } });
}

export async function GET() {
  const auth = await requireSuperadmin();
  if (auth instanceof NextResponse) return auth;
  const schedule = await getOrCreateSchedule();
  const completed = await db.backup.findMany({ where: { companyId: COMPANY_ID, status: "Completed" }, select: { sizeMB: true } });
  const storageUsedGB = completed.reduce((s, b) => s + b.sizeMB, 0) / 1024;
  return NextResponse.json({ schedule: { ...toDTO(schedule), storageUsedGB } });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireSuperadmin();
  if (auth instanceof NextResponse) return auth;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (typeof body.dailyEnabled === "boolean") data.dailyEnabled = body.dailyEnabled;
  if (typeof body.dailyTime === "string") data.dailyTime = body.dailyTime;
  if (typeof body.weeklyFullEnabled === "boolean") data.weeklyFullEnabled = body.weeklyFullEnabled;
  if (typeof body.weeklyDay === "string") data.weeklyDay = body.weeklyDay;
  if (typeof body.retentionDays === "number") data.retentionDays = Math.round(body.retentionDays);
  if (typeof body.storageCapGB === "number") data.storageCapGB = Math.round(body.storageCapGB);

  await getOrCreateSchedule();
  const updated = await db.backupSchedule.update({ where: { companyId: COMPANY_ID }, data });
  const completed = await db.backup.findMany({ where: { companyId: COMPANY_ID, status: "Completed" }, select: { sizeMB: true } });
  const storageUsedGB = completed.reduce((s, b) => s + b.sizeMB, 0) / 1024;
  return NextResponse.json({ schedule: { ...toDTO(updated), storageUsedGB } });
}

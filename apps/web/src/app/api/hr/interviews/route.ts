import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";

function toDTO(i: {
  id: string; positionId: string; candidateId: string; candidateName: string; role: string;
  round: string; scheduledOn: Date; duration: number; interviewer: string; status: string;
  feedback: string | null; rating: number | null;
}) {
  return {
    id: i.id,
    positionId: i.positionId,
    candidateId: i.candidateId,
    candidateName: i.candidateName,
    role: i.role,
    round: i.round,
    scheduledOn: i.scheduledOn.toISOString(),
    duration: i.duration,
    interviewer: i.interviewer,
    status: i.status,
    feedback: i.feedback ?? undefined,
    rating: i.rating ?? undefined,
  };
}

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "hr");
  if (denied) return denied;

  const interviews = await db.hrInterview.findMany({
    where: { companyId: sessionUser.companyId },
    orderBy: { scheduledOn: "desc" },
  });
  return NextResponse.json({ interviews: interviews.map(toDTO) });
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "hr");
  if (denied) return denied;

  const body = await req.json();
  const positionId = String(body.positionId || "").trim();
  const candidateId = String(body.candidateId || "").trim();
  const candidateName = String(body.candidateName || "").trim();
  if (!positionId || !candidateId || !candidateName) {
    return NextResponse.json({ error: "positionId, candidateId, and candidateName are required." }, { status: 400 });
  }

  const created = await db.hrInterview.create({
    data: {
      companyId: sessionUser.companyId,
      positionId,
      candidateId,
      candidateName,
      role: String(body.role || "").trim(),
      round: body.round || "Telephonic",
      scheduledOn: body.scheduledOn ? new Date(body.scheduledOn) : new Date(Date.now() + 86_400_000),
      duration: Number.isFinite(Number(body.duration)) ? Number(body.duration) : 45,
      interviewer: String(body.interviewer || sessionUser.name).trim(),
      status: body.status || "Scheduled",
    },
  });
  return NextResponse.json({ interview: toDTO(created) }, { status: 201 });
}

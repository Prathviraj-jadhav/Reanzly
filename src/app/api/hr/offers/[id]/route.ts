import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";

function toDTO(o: {
  id: string; positionId: string; candidateId: string; candidateName: string; role: string;
  branch: string; offeredCTC: number; joiningDate: Date; status: string; issuedOn: Date;
  acceptedOn: Date | null; declinedOn: Date | null; declinedReason: string | null;
}) {
  return {
    id: o.id,
    positionId: o.positionId,
    candidateId: o.candidateId,
    candidateName: o.candidateName,
    role: o.role,
    branch: o.branch,
    offeredCTC: o.offeredCTC,
    joiningDate: o.joiningDate.toISOString(),
    status: o.status,
    issuedOn: o.issuedOn.toISOString(),
    acceptedOn: o.acceptedOn ? o.acceptedOn.toISOString() : undefined,
    declinedOn: o.declinedOn ? o.declinedOn.toISOString() : undefined,
    declinedReason: o.declinedReason ?? undefined,
  };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "hr");
  if (denied) return denied;

  const { id } = await params;
  const existing = await db.hrOfferLetter.findFirst({ where: { id, companyId: sessionUser.companyId } });
  if (!existing) return NextResponse.json({ error: "Offer not found." }, { status: 404 });

  const body = await req.json();
  const status = String(body.status || "").trim();
  if (!["Drafted", "Sent", "Accepted", "Declined", "Expired"].includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const updated = await db.hrOfferLetter.update({
    where: { id },
    data: {
      status,
      acceptedOn: status === "Accepted" ? new Date() : existing.acceptedOn,
      declinedOn: status === "Declined" ? new Date() : existing.declinedOn,
    },
  });
  return NextResponse.json({ offer: toDTO(updated) });
}

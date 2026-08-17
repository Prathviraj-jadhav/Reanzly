import { NextResponse } from "next/server";
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

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "hr");
  if (denied) return denied;

  const offers = await db.hrOfferLetter.findMany({
    where: { companyId: sessionUser.companyId },
    orderBy: { issuedOn: "desc" },
  });
  return NextResponse.json({ offers: offers.map(toDTO) });
}

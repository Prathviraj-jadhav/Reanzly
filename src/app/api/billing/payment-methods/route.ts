import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

// Real, persisted "card on file" records - deliberately store ONLY the
// safe display attributes (brand/last 4/expiry/holder name), never a full
// card number or CVV. A real charge would need a real payment gateway
// (Razorpay/Stripe) tokenizing the card client-side and handing back a
// token - out of scope per the standing "don't touch third-party API
// keys" constraint. This models "a card is on file", not a working
// charge path. Server-side validation below rejects anything that looks
// like a full card number was sent, as defense-in-depth against a
// misbehaving client.

function toDTO(m: Awaited<ReturnType<typeof db.paymentMethod.findFirstOrThrow>>) {
  return {
    id: m.id,
    brand: m.brand,
    last4: m.last4,
    expMonth: m.expMonth,
    expYear: m.expYear,
    holderName: m.holderName,
    isDefault: m.isDefault,
    addedOn: m.createdAt.toISOString(),
  };
}

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const methods = await db.paymentMethod.findMany({
    where: { companyId: sessionUser.companyId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ paymentMethods: methods.map(toDTO) });
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json();
  const last4 = String(body.last4 || "");
  const holderName = String(body.holderName || "").trim();
  if (!/^\d{4}$/.test(last4)) {
    return NextResponse.json({ error: "last4 must be exactly 4 digits - never send a full card number." }, { status: 400 });
  }
  if (!holderName) return NextResponse.json({ error: "holderName is required." }, { status: 400 });
  const expMonth = Number(body.expMonth);
  const expYear = Number(body.expYear);
  if (!(expMonth >= 1 && expMonth <= 12) || !(expYear >= new Date().getFullYear())) {
    return NextResponse.json({ error: "Invalid expiry date." }, { status: 400 });
  }

  const makeDefault = Boolean(body.isDefault) || (await db.paymentMethod.count({ where: { companyId: sessionUser.companyId } })) === 0;

  const created = await db.$transaction(async (tx) => {
    if (makeDefault) {
      await tx.paymentMethod.updateMany({ where: { companyId: sessionUser.companyId }, data: { isDefault: false } });
    }
    return tx.paymentMethod.create({
      data: {
        companyId: sessionUser.companyId,
        brand: body.brand || "Card",
        last4,
        expMonth,
        expYear,
        holderName,
        isDefault: makeDefault,
      },
    });
  });
  return NextResponse.json({ paymentMethod: toDTO(created) }, { status: 201 });
}

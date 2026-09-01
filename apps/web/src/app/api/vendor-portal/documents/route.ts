import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getPortalCustomer, requirePortalCustomer } from "@/lib/vendor-portal";

// GET /api/vendor-portal/documents
// Real Document rows scoped to this portal session's linked Customer.
// Document has no FK for Customer/Vendor entities - per /api/documents'
// own POST handler, entityId stores the customer's *name* directly for
// entityType "Customer" (no real foreign key on this model for that case),
// so that's what we filter on here too.
export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const customer = await getPortalCustomer(sessionUser);
  const denied = requirePortalCustomer(customer);
  if (denied) return denied;

  const documents = await db.document.findMany({
    where: { companyId: sessionUser.companyId, entityType: "Customer", entityId: customer!.companyName },
    orderBy: { uploadDate: "desc" },
  });

  return NextResponse.json({
    documents: documents.map((d) => ({
      id: d.id,
      name: d.name,
      type: d.type,
      issueDate: d.issueDate ? d.issueDate.toISOString() : "",
      expiryDate: d.expiryDate ? d.expiryDate.toISOString() : undefined,
      status: d.status,
      uploadDate: d.uploadDate.toISOString(),
    })),
  });
}

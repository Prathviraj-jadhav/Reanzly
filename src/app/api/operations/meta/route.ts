import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";

// Real assignee + linked-entity option lists for the task create/edit
// drawer, replacing mock-data.ts's ASSIGNEES/TRIPS/VEHICLES/DRIVERS/
// CUSTOMERS/INVOICES arrays with the company's actual staff, drivers,
// trips, vehicles, customers, and invoices.

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "operations-hub");
  if (denied) return denied;
  const companyId = sessionUser.companyId;

  const [employees, drivers, trips, vehicles, customers, invoices] = await Promise.all([
    db.employee.findMany({ where: { companyId, status: "Active" }, select: { name: true }, take: 60 }),
    db.driver.findMany({ where: { companyId }, select: { id: true, name: true }, orderBy: { name: "asc" }, take: 40 }),
    db.trip.findMany({ where: { companyId }, select: { id: true, tripId: true }, orderBy: { createdDate: "desc" }, take: 25 }),
    db.vehicle.findMany({ where: { companyId }, select: { id: true, name: true, licensePlate: true }, orderBy: { name: "asc" }, take: 40 }),
    db.customer.findMany({ where: { companyId }, select: { id: true, companyName: true }, orderBy: { companyName: "asc" }, take: 40 }),
    db.invoice.findMany({ where: { companyId }, select: { id: true, invoiceNumber: true }, orderBy: { invoiceDate: "desc" }, take: 25 }),
  ]);

  const assigneeNames = new Set<string>();
  employees.forEach((e) => assigneeNames.add(e.name));
  drivers.forEach((d) => assigneeNames.add(d.name));

  return NextResponse.json({
    assignees: Array.from(assigneeNames).sort(),
    linkedEntities: {
      Trip: trips.map((t) => ({ id: t.id, name: t.tripId })),
      Vehicle: vehicles.map((v) => ({ id: v.id, name: `${v.name} (${v.licensePlate})` })),
      Driver: drivers.map((d) => ({ id: d.id, name: d.name })),
      Customer: customers.map((c) => ({ id: c.id, name: c.companyName })),
      Invoice: invoices.map((i) => ({ id: i.id, name: i.invoiceNumber })),
    },
  });
}

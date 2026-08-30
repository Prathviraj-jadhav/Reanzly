import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const where: any = {
      companyId: session.companyId,
    };

    if (status) {
      where.status = status;
    }

    const checks = await db.qualityCheck.findMany({
      where,
      orderBy: { date: "desc" },
    });

    // Parse JSON fields
    const parsedChecks = checks.map((c) => ({
      ...c,
      findings: c.findingsJson ? JSON.parse(c.findingsJson) : [],
      controlPoints: c.controlPointsJson ? JSON.parse(c.controlPointsJson) : [],
      correctiveActions: c.correctiveActionsJson ? JSON.parse(c.correctiveActionsJson) : [],
      activity: c.activityJson ? JSON.parse(c.activityJson) : [],
    }));

    return NextResponse.json({ checks: parsedChecks });
  } catch (error) {
    console.error("GET /api/quality-checks error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Generate a human readable ID
    const count = await db.qualityCheck.count({
      where: { companyId: session.companyId },
    });
    const checkId = `QC-${String(count + 1).padStart(5, "0")}`;

    const check = await db.qualityCheck.create({
      data: {
        companyId: session.companyId,
        checkId,
        type: body.type,
        reference: body.reference,
        inspector: body.inspector,
        date: new Date(body.date),
        result: body.expectedResult || "Pass",
        status: "Scheduled",
        location: body.location || "",
        notes: body.notes || "",
        findingsJson: "[]",
        controlPointsJson: "[]",
        correctiveActionsJson: "[]",
        activityJson: "[]",
      },
    });

    return NextResponse.json({
      check: {
        ...check,
        findings: [],
        controlPoints: [],
        correctiveActions: [],
        activity: [],
      }
    });
  } catch (error) {
    console.error("POST /api/quality-checks error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

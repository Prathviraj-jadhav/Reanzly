import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const check = await db.qualityCheck.findFirst({
      where: {
        id: params.id,
        companyId: session.companyId,
      },
    });

    if (!check) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const parsedCheck = {
      ...check,
      findings: check.findingsJson ? JSON.parse(check.findingsJson) : [],
      controlPoints: check.controlPointsJson ? JSON.parse(check.controlPointsJson) : [],
      correctiveActions: check.correctiveActionsJson ? JSON.parse(check.correctiveActionsJson) : [],
      activity: check.activityJson ? JSON.parse(check.activityJson) : [],
    };

    return NextResponse.json(parsedCheck);
  } catch (error) {
    console.error("GET /api/quality-checks/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const dataToUpdate: any = {};
    if (body.status) dataToUpdate.status = body.status;
    if (body.result) dataToUpdate.result = body.result;
    if (body.score !== undefined) dataToUpdate.score = body.score;
    if (body.notes !== undefined) dataToUpdate.notes = body.notes;
    
    // Convert arrays back to JSON strings if they are present in the update
    if (body.findings) dataToUpdate.findingsJson = JSON.stringify(body.findings);
    if (body.controlPoints) dataToUpdate.controlPointsJson = JSON.stringify(body.controlPoints);
    if (body.correctiveActions) dataToUpdate.correctiveActionsJson = JSON.stringify(body.correctiveActions);
    if (body.activity) dataToUpdate.activityJson = JSON.stringify(body.activity);

    const check = await db.qualityCheck.update({
      where: {
        id: params.id,
        companyId: session.companyId,
      },
      data: dataToUpdate,
    });

    const parsedCheck = {
      ...check,
      findings: check.findingsJson ? JSON.parse(check.findingsJson) : [],
      controlPoints: check.controlPointsJson ? JSON.parse(check.controlPointsJson) : [],
      correctiveActions: check.correctiveActionsJson ? JSON.parse(check.correctiveActionsJson) : [],
      activity: check.activityJson ? JSON.parse(check.activityJson) : [],
    };

    return NextResponse.json({ check: parsedCheck });
  } catch (error) {
    console.error("PATCH /api/quality-checks/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const deleted = await db.qualityCheck.deleteMany({
      where: {
        id: params.id,
        companyId: session.companyId,
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/quality-checks/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

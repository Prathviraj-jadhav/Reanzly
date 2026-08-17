import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runSelfImprovementCycle } from "@/lib/slm/self-learning";
import { getSessionUser } from "@/lib/auth";
import { unauthorized } from "@/lib/permissions";

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) return unauthorized();

    const body = await req.json();
    const { feedbackId, rating, comment } = body;

    if (!feedbackId) {
      return NextResponse.json({ error: "feedbackId is required" }, { status: 400 });
    }

    const existing = await db.slmFeedback.findFirst({
      where: { id: feedbackId, companyId: sessionUser.companyId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Feedback not found." }, { status: 404 });
    }

    const feedback = await db.slmFeedback.update({
      where: { id: existing.id },
      data: {
        rating: Number(rating),
        comment: comment || null,
      },
    });

    return NextResponse.json({ success: true, feedback });
  } catch (error) {
    console.error("Feedback submission error:", error);
    return NextResponse.json({ error: "Failed to record feedback" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) return unauthorized();

    const stats = await runSelfImprovementCycle(sessionUser.companyId);

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error("Self improvement cycle error:", error);
    return NextResponse.json({ error: "Failed to run optimization cycle" }, { status: 500 });
  }
}

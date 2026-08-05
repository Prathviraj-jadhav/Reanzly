import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runSelfImprovementCycle } from "@/lib/slm/self-learning";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { feedbackId, rating, comment } = body;

    if (!feedbackId) {
      return NextResponse.json({ error: "feedbackId is required" }, { status: 400 });
    }

    const feedback = await db.slmFeedback.update({
      where: { id: feedbackId },
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
    const body = await req.json();
    const { companyId } = body;

    if (!companyId) {
      return NextResponse.json({ error: "companyId is required" }, { status: 400 });
    }

    const stats = await runSelfImprovementCycle(companyId);

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error("Self improvement cycle error:", error);
    return NextResponse.json({ error: "Failed to run optimization cycle" }, { status: 500 });
  }
}

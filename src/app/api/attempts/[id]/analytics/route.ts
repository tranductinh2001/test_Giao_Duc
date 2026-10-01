import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ExamAnalyticsService } from "@/features/exams/services/ExamAnalyticsService";
import { getErrorMessage } from "@/lib/api";

// GET /api/attempts/[id]/analytics — get detailed analysis by category
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const { id: attemptId } = await params;
    const analyticsService = new ExamAnalyticsService();
    const analysis = await analyticsService.analyzeAttempt(attemptId, session.user.id!);

    return NextResponse.json({ success: true, data: analysis });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: "INTERNAL_SERVER_ERROR", message: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

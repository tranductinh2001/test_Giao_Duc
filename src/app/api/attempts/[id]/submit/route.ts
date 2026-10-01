import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ExamService } from "@/features/exams/services/ExamService";
import { SubmitAnswerSchema } from "@/features/exams/schemas";
import { getErrorCode, getErrorMessage } from "@/lib/api";

// POST /api/attempts/[id]/submit
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });

    const { id: attemptId } = await params;
    const body = await req.json();

    console.log("[Submit] Attempt ID:", attemptId);
    console.log("[Submit] User ID:", session.user.id);
    console.log("[Submit] Answers count:", body.answers?.length || 0);

    const parsed = SubmitAnswerSchema.safeParse(body);

    if (!parsed.success) {
      console.error("[Submit] Validation error:", parsed.error.flatten());
      return NextResponse.json(
        { success: false, error: "VALIDATION_ERROR", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const examService = new ExamService();
    const result = await examService.submitAttempt(
      attemptId,
      session.user.id!,
      parsed.data.answers
    );

    console.log("[Submit] Success:", result);
    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    console.error("[Submit] Error:", error);

    // Log full error stack
    if (error instanceof Error) {
      console.error("[Submit] Error stack:", error.stack);
    }

    const errorCode = getErrorCode(error);
    const status =
      errorCode === "ALREADY_SUBMITTED" ? 409
      : errorCode === "FORBIDDEN" ? 403
      : errorCode === "ATTEMPT_NOT_FOUND" ? 404
      : 500;
    return NextResponse.json(
      { success: false, error: errorCode, message: getErrorMessage(error) },
      { status }
    );
  }
}

// GET /api/attempts/[id]/submit — review attempt
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });

    const { id: attemptId } = await params;
    const examService = new ExamService();
    const review = await examService.getAttemptReview(attemptId, session.user.id!);
    return NextResponse.json({ success: true, data: review });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: "INTERNAL_SERVER_ERROR", message: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

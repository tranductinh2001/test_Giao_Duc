import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ExamService } from "@/features/exams/services/ExamService";
import { getErrorMessage } from "@/lib/api";

// GET /api/user/stats — score trend + pass/fail ratio + wrong answers count + bookmarks count
export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });

    const userId = session.user.id!;
    const examService = new ExamService();

    const [scoreTrend, passFailRatio, wrongAnswers, bookmarks, attempts] = await Promise.all([
      examService.getScoreTrend(userId),
      examService.getPassFailRatio(userId),
      examService.getUserWrongAnswers(userId),
      examService.getUserBookmarks(userId),
      examService.getUserAttempts(userId),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        scoreTrend,
        passFailRatio,
        totalAttempts: attempts.length,
        wrongAnswerCount: wrongAnswers.length,
        bookmarkCount: bookmarks.length,
        recentAttempts: attempts.slice(0, 5),
        wrongAnswers,
        bookmarks,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: "INTERNAL_SERVER_ERROR", message: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: attemptId } = await params;

    // Fetch attempt with all related data
    const attempt = await prisma.examAttempt.findUnique({
      where: { id: attemptId },
      include: {
        exam: {
          select: {
            title: true,
            description: true,
            timeLimit: true,
          },
        },
        answers: {
          include: {
            question: true,
          },
        },
      },
    });

    if (!attempt) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy bài thi." },
        { status: 404 }
      );
    }

    // Check ownership
    if (attempt.userId !== session.user.id) {
      return NextResponse.json(
        { success: false, message: "Không có quyền truy cập bài thi này." },
        { status: 403 }
      );
    }

    // Can only review submitted attempts
    if (attempt.status === "IN_PROGRESS") {
      return NextResponse.json(
        { success: false, message: "Bài thi chưa được nộp." },
        { status: 400 }
      );
    }

    // Get all unique question IDs
    const questionIds = [...new Set(attempt.answers.map((a) => a.questionId))];

    // Fetch all choices for these questions
    const allChoices = await prisma.choice.findMany({
      where: {
        questionId: { in: questionIds },
      },
      select: {
        id: true,
        content: true,
        isCorrect: true,
        questionId: true,
      },
    });

    // Build questions array with unique questions
    const questionsMap = new Map();
    const userAnswersMap = new Map();

    attempt.answers.forEach((answer) => {
      if (!questionsMap.has(answer.question.id)) {
        const questionChoices = allChoices.filter(
          (c) => c.questionId === answer.question.id
        );

        questionsMap.set(answer.question.id, {
          id: answer.question.id,
          questionText: answer.question.content,
          explanation: answer.question.explanation,
          imageUrl: null,
          answers: questionChoices.map((c) => ({
            id: c.id,
            answerText: c.content,
            isCorrect: c.isCorrect,
          })),
        });
      }
      userAnswersMap.set(answer.questionId, {
        questionId: answer.questionId,
        selectedAnswerId: answer.selectedChoiceId,
      });
    });

    const questions = Array.from(questionsMap.values());
    const userAnswers = Array.from(userAnswersMap.values());

    const response = {
      id: attempt.id,
      score: attempt.score || 0,
      correctCount: attempt.correctCount || 0,
      totalCount: attempt.totalCount || 0,
      startedAt: attempt.startedAt.toISOString(),
      submittedAt: attempt.submittedAt?.toISOString() || null,
      status: attempt.status,
      timeSpent: attempt.timeSpent,
      exam: attempt.exam,
      questions,
      userAnswers,
    };

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error("Fetch review error:", error);
    return NextResponse.json(
      { success: false, message: "Có lỗi xảy ra khi tải chi tiết bài thi." },
      { status: 500 }
    );
  }
}

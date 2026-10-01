import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SmartExamGeneratorService } from "@/features/exams/services/SmartExamGeneratorService";

// POST /api/practice/start - Start practice session
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // Get all categories
    const categories = await prisma.category.findMany({
      select: { id: true },
    });

    if (categories.length === 0) {
      return NextResponse.json(
        { success: false, error: "NO_CATEGORIES" },
        { status: 404 }
      );
    }

    // Use smart algorithm to select 10 questions
    const smartService = new SmartExamGeneratorService();
    const questionIds = await smartService.generateSmartExam(
      session.user.id!,
      categories.map((c) => c.id),
      10
    );

    if (questionIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "NO_QUESTIONS" },
        { status: 404 }
      );
    }

    // Load full question data
    const questions = await prisma.question.findMany({
      where: { id: { in: questionIds } },
      select: {
        id: true,
        content: true,
        explanation: true,
        category: { select: { name: true } },
        choices: {
          select: {
            id: true,
            content: true,
            isCorrect: true,
          },
        },
      },
    });

    // Transform data
    const formattedQuestions = questions.map((q) => ({
      id: q.id,
      content: q.content,
      explanation: q.explanation,
      categoryName: q.category?.name || null,
      choices: q.choices,
    }));

    return NextResponse.json({
      success: true,
      data: { questions: formattedQuestions },
    });
  } catch (error: unknown) {
    console.error("Practice start error:", error);
    return NextResponse.json(
      { success: false, error: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

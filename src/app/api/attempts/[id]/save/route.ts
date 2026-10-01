import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getErrorMessage } from "@/lib/api";

// POST /api/attempts/[id]/save - Auto-save progress
export async function POST(
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
    const body = await req.json();
    const { answers, bookmarks, secondsLeft } = body;

    const attempt = await prisma.examAttempt.findUnique({
      where: { id: attemptId },
      select: { userId: true, status: true },
    });

    if (!attempt) {
      return NextResponse.json(
        { success: false, error: "ATTEMPT_NOT_FOUND" },
        { status: 404 }
      );
    }

    if (attempt.userId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    if (attempt.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { success: false, error: "ATTEMPT_ALREADY_SUBMITTED" },
        { status: 400 }
      );
    }

    // Save state
    await prisma.examAttempt.update({
      where: { id: attemptId },
      data: {
        savedAnswers: {
          answers,
          bookmarks,
          secondsLeft,
          savedAt: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: "INTERNAL_SERVER_ERROR", message: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

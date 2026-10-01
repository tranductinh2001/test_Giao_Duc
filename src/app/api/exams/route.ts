import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ExamService } from "@/features/exams/services/ExamService";
import { CreateExamSchema } from "@/features/exams/schemas";
import { getErrorMessage } from "@/lib/api";

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const examService = new ExamService();
    const exams = await examService.getPublishedExams();
    return NextResponse.json({ success: true, data: exams });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: "INTERNAL_SERVER_ERROR", message: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = CreateExamSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "VALIDATION_ERROR", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const examService = new ExamService();
    const exam = await examService.generateExamFromMatrix(parsed.data);
    return NextResponse.json({ success: true, data: exam }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: "INTERNAL_SERVER_ERROR", message: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

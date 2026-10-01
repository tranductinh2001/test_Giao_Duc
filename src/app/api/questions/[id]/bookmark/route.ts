import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ExamService } from "@/features/exams/services/ExamService";
import { getErrorMessage } from "@/lib/api";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { id: questionId } = await params;
    const service = new ExamService();
    const result = await service.toggleBookmark(session.user.id!, questionId);

    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: "INTERNAL_SERVER_ERROR", message: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

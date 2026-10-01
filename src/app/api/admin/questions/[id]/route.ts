import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { QuestionService } from "@/features/questions/services/QuestionService";
import { QuestionSchema } from "@/features/questions/schemas";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN", message: "Bạn không có quyền truy cập tài nguyên này." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = QuestionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "VALIDATION_ERROR",
          message: "Dữ liệu cập nhật câu hỏi không hợp lệ.",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const questionService = new QuestionService();
    const updated = await questionService.updateQuestion(id, parsed.data);

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    if (error.message === "QUESTION_NOT_FOUND") {
      return NextResponse.json(
        { success: false, error: "QUESTION_NOT_FOUND", message: "Không tìm thấy câu hỏi này." },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { success: false, error: "INTERNAL_SERVER_ERROR", message: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN", message: "Bạn không có quyền truy cập tài nguyên này." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const questionService = new QuestionService();

    await questionService.deleteQuestion(id);
    return NextResponse.json({ success: true, message: "Đã xóa câu hỏi thành công." });
  } catch (error: any) {
    if (error.message === "QUESTION_NOT_FOUND") {
      return NextResponse.json(
        { success: false, error: "QUESTION_NOT_FOUND", message: "Không tìm thấy câu hỏi cần xóa." },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { success: false, error: "INTERNAL_SERVER_ERROR", message: error.message },
      { status: 500 }
    );
  }
}

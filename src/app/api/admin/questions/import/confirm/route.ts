import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { QuestionService } from "@/features/questions/services/QuestionService";
import { QuestionSchema } from "@/features/questions/schemas";
import { z } from "zod";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN", message: "Bạn không có quyền thực hiện hành động này." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { questions } = body;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        { success: false, error: "EMPTY_DATA", message: "Không tìm thấy dữ liệu câu hỏi để lưu." },
        { status: 400 }
      );
    }

    // Validate all questions
    const ValidationSchema = z.array(QuestionSchema);
    const parsed = ValidationSchema.safeParse(questions);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "VALIDATION_ERROR",
          message: "Một số câu hỏi không vượt qua kiểm tra tính hợp lệ dữ liệu.",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const questionService = new QuestionService();
    await questionService.bulkSaveQuestions(parsed.data);

    return NextResponse.json({
      success: true,
      message: `Đã nhập thành công ${parsed.data.length} câu hỏi vào ngân hàng đề thi.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "INTERNAL_SERVER_ERROR", message: error.message },
      { status: 500 }
    );
  }
}

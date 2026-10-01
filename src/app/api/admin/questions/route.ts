import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { QuestionService } from "@/features/questions/services/QuestionService";
import { QuestionSchema } from "@/features/questions/schemas";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN", message: "Bạn không có quyền truy cập tài nguyên này." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("categoryId") || undefined;
    const difficulty = (searchParams.get("difficulty") as any) || undefined;
    const search = searchParams.get("search") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const questionService = new QuestionService();
    const result = await questionService.getQuestions({
      categoryId,
      difficulty,
      search,
      page,
      limit,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "INTERNAL_SERVER_ERROR", message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN", message: "Bạn không có quyền truy cập tài nguyên này." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = QuestionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "VALIDATION_ERROR",
          message: "Dữ liệu câu hỏi không hợp lệ.",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const questionService = new QuestionService();
    const question = await questionService.createQuestion(parsed.data);

    return NextResponse.json({ success: true, data: question }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "INTERNAL_SERVER_ERROR", message: error.message },
      { status: 500 }
    );
  }
}

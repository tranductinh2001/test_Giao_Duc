import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { CategoryService } from "@/features/questions/services/CategoryService";
import { CategorySchema } from "@/features/questions/schemas";
import { getErrorMessage } from "@/lib/api";

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
    const flat = searchParams.get("flat") === "true";

    const categoryService = new CategoryService();
    
    if (flat) {
      const flatList = await categoryService.getFlatCategories();
      return NextResponse.json({ success: true, data: flatList });
    }

    const tree = await categoryService.getCategoryTree();
    return NextResponse.json({ success: true, data: tree });
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
      return NextResponse.json(
        { success: false, error: "FORBIDDEN", message: "Bạn không có quyền truy cập tài nguyên này." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = CategorySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "VALIDATION_ERROR",
          message: "Dữ liệu không hợp lệ.",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const categoryService = new CategoryService();
    const category = await categoryService.createCategory(parsed.data);

    return NextResponse.json({ success: true, data: category }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: "INTERNAL_SERVER_ERROR", message: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

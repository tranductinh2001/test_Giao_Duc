import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { CategoryService } from "@/features/questions/services/CategoryService";
import { CategorySchema } from "@/features/questions/schemas";

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
    const parsed = CategorySchema.partial().safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "VALIDATION_ERROR",
          message: "Dữ liệu cập nhật không hợp lệ.",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const categoryService = new CategoryService();
    const updated = await categoryService.updateCategory(id, parsed.data);

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
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
    const categoryService = new CategoryService();

    try {
      await categoryService.deleteCategory(id);
      return NextResponse.json({ success: true, message: "Đã xóa chuyên mục thành công." });
    } catch (err: any) {
      if (err.message === "CATEGORY_HAS_CHILDREN") {
        return NextResponse.json(
          {
            success: false,
            error: "CATEGORY_HAS_CHILDREN",
            message: "Không thể xóa chuyên mục này vì chứa các chuyên mục con.",
          },
          { status: 400 }
        );
      }
      if (err.message === "CATEGORY_HAS_QUESTIONS") {
        return NextResponse.json(
          {
            success: false,
            error: "CATEGORY_HAS_QUESTIONS",
            message: "Không thể xóa chuyên mục này vì chứa câu hỏi. Hãy xóa hoặc di chuyển các câu hỏi trước.",
          },
          { status: 400 }
        );
      }
      throw err;
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "INTERNAL_SERVER_ERROR", message: error.message },
      { status: 500 }
    );
  }
}

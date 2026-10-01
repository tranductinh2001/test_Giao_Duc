import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { CategoryService } from "@/features/questions/services/CategoryService";
import { getErrorMessage } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED", message: "Bạn cần đăng nhập để thực hiện thao tác này." },
        { status: 401 }
      );
    }

    const categoryService = new CategoryService();
    const flatList = await categoryService.getFlatCategories();
    return NextResponse.json({ success: true, data: flatList });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: "INTERNAL_SERVER_ERROR", message: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ImportService } from "@/features/questions/services/ImportService";
import { validateFile, ALLOWED_MIME_TYPES } from "@/lib/file-validator";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN", message: "Bạn không có quyền thực hiện hành động này." },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const categoryId = formData.get("categoryId") as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "MISSING_FILE", message: "Vui lòng chọn tệp tin cần tải lên." },
        { status: 400 }
      );
    }

    if (!categoryId) {
      return NextResponse.json(
        { success: false, error: "MISSING_CATEGORY", message: "Vui lòng chọn chuyên mục cho câu hỏi." },
        { status: 400 }
      );
    }

    // Validate file type and size using shared validator
    // For import files (XLSX, XLS, JSON), we use the document category limit
    const validation = validateFile({
      name: file.name,
      size: file.size,
      type: file.type,
    });

    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.errorCode || "FILE_VALIDATION_FAILED", message: validation.error },
        { status: 400 }
      );
    }

    const filename = file.name.toLowerCase();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const importService = new ImportService();
    let result: { questions: any[]; errors: string[] };

    if (filename.endsWith(".docx")) {
      result = await importService.parseWordDocx(buffer, categoryId);
    } else if (filename.endsWith(".xlsx") || filename.endsWith(".xls")) {
      result = await importService.parseExcelFile(buffer, categoryId);
    } else if (filename.endsWith(".json")) {
      result = await importService.parseJsonFile(buffer, categoryId);
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "UNSUPPORTED_FORMAT",
          message: "Định dạng file không được hỗ trợ. Vui lòng tải lên file Word (.docx), Excel (.xlsx) hoặc JSON (.json).",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        questions: result.questions,
        errors: result.errors,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "INTERNAL_SERVER_ERROR", message: error.message },
      { status: 500 }
    );
  }
}

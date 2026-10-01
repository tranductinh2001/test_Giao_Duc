import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { saveTextbook, getStorageStats, deleteTextbook } from "@/core/textbook/storage";

/**
 * GET /api/admin/textbooks
 * List all textbooks with optional filters
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Không có quyền truy cập" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const grade = searchParams.get("grade");
    const subject = searchParams.get("subject");
    const status = searchParams.get("status");
    const code = searchParams.get("code"); // Filter by book code for versioning

    const books = await prisma.textbookBook.findMany({
      where: {
        isActive: true,
        ...(code && { code }),
        ...(grade && { grade }),
        ...(subject && { subject }),
        ...(status && { tocStatus: status as any }),
      },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { chapters: true } },
      },
    });

    // Convert BigInt to number for JSON serialization
    const booksWithSerializedBigInt = books.map(book => ({
      ...book,
      fileSize: book.fileSize ? Number(book.fileSize) : null,
    }));

    const stats = await getStorageStats();

    return NextResponse.json({
      success: true,
      data: booksWithSerializedBigInt,
      stats,
    });
  } catch (error) {
    console.error("[Textbooks] GET error:", error);
    return NextResponse.json({ success: false, message: "Lỗi server" }, { status: 500 });
  }
}

/**
 * POST /api/admin/textbooks
 * Upload new textbook PDF
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Không có quyền truy cập" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const code = formData.get("code") as string;
    const version = formData.get("version") as string || "1.0";
    const name = formData.get("name") as string;
    const description = formData.get("description") as string | null;
    const grade = formData.get("grade") as string;
    const subject = formData.get("subject") as string;

    if (!file) {
      return NextResponse.json({ success: false, message: "Vui lòng chọn file PDF" }, { status: 400 });
    }

    if (!code || !name || !grade || !subject) {
      return NextResponse.json({ success: false, message: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }

    // Validate file type
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".pdf")) {
      return NextResponse.json({ success: false, message: "Chỉ hỗ trợ file PDF" }, { status: 400 });
    }

    // Parse version to number
    const versionNum = parseFloat(version);

    // Check if code + version already exists
    const existing = await prisma.textbookBook.findUnique({
      where: { code_version: { code, version: versionNum } },
    });

    if (existing) {
      return NextResponse.json({ success: false, message: `Sách ${code} phiên bản ${version} đã tồn tại` }, { status: 400 });
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save textbook (storage expects string version)
    const versionStr = versionNum.toString();
    const result = await saveTextbook(buffer, file.name, {
      code,
      version: versionStr,
      name,
      description: description || undefined,
      grade,
      subject,
    });

    return NextResponse.json({
      success: true,
      message: "Đã upload sách thành công",
      data: {
        id: result.bookId,
        pdfPath: result.pdfPath,
        pageCount: result.pageCount,
        fileSize: result.fileSize,
        version: versionNum,
      },
    });
  } catch (error) {
    console.error("[Textbooks] POST error:", error);
    const message = error instanceof Error ? error.message : "Lỗi khi upload";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/textbooks
 * Delete textbook
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Không có quyền truy cập" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, message: "Thiếu ID sách" }, { status: 400 });
    }

    await deleteTextbook(id);

    return NextResponse.json({
      success: true,
      message: "Đã xóa sách",
    });
  } catch (error) {
    console.error("[Textbooks] DELETE error:", error);
    const message = error instanceof Error ? error.message : "Lỗi khi xóa";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

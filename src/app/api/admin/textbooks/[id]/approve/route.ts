/**
 * Approval API
 * Handles approval/rejection of books and chapters
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// POST /api/admin/textbooks/[id]/approve - Approve a book
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Không có quyền truy cập" }, { status: 403 });
    }

    const { id: bookId } = await params;
    const body = await req.json();
    const { action, reason } = body; // action: "approve" | "reject"

    const book = await prisma.textbookBook.findUnique({
      where: { id: bookId },
      include: { chapters: true },
    });

    if (!book) {
      return NextResponse.json({ success: false, message: "Không tìm thấy sách" }, { status: 404 });
    }

    if (action === "approve") {
      // Approve book
      await prisma.textbookBook.update({
        where: { id: bookId },
        data: {
          isApproved: true,
          approvedAt: new Date(),
          approvedBy: session.user.id,
        },
      });

      // Also approve all pending chapters
      await prisma.textbookChapter.updateMany({
        where: { bookId, status: "PENDING" },
        data: {
          isApproved: true,
          status: "APPROVED",
          approvedAt: new Date(),
          approvedBy: session.user.id,
        },
      });

      return NextResponse.json({ success: true, message: "Đã phê duyệt sách và tất cả chương" });
    } else if (action === "reject") {
      // Reject book
      await prisma.textbookBook.update({
        where: { id: bookId },
        data: {
          isApproved: false,
          tocStatus: "FAILED",
        },
      });

      // Mark chapters as rejected
      await prisma.textbookChapter.updateMany({
        where: { bookId, status: "PENDING" },
        data: {
          isApproved: false,
          status: "REJECTED",
          rejectionReason: reason || "Rejected by admin",
        },
      });

      return NextResponse.json({ success: true, message: "Đã từ chối sách" });
    }

    return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("[Approve] POST error:", error);
    return NextResponse.json({ success: false, message: "Lỗi server" }, { status: 500 });
  }
}

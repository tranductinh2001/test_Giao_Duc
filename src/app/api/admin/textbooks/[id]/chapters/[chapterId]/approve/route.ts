/**
 * Chapter Approval API
 * Handles approval/rejection of individual chapters
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// POST /api/admin/textbooks/[id]/chapters/[chapterId]/approve
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; chapterId: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Không có quyền truy cập" }, { status: 403 });
    }

    const { id: bookId, chapterId } = await params;
    const body = await req.json();
    const { action, reason } = body; // action: "approve" | "reject"

    const chapter = await prisma.textbookChapter.findFirst({
      where: { id: chapterId, bookId },
    });

    if (!chapter) {
      return NextResponse.json({ success: false, message: "Không tìm thấy chương" }, { status: 404 });
    }

    if (action === "approve") {
      await prisma.textbookChapter.update({
        where: { id: chapterId },
        data: {
          isApproved: true,
          status: "APPROVED",
          approvedAt: new Date(),
          approvedBy: session.user.id,
          rejectionReason: null,
        },
      });

      // Check if all chapters are approved
      const pendingChapters = await prisma.textbookChapter.count({
        where: { bookId, isApproved: false, isActive: true },
      });

      if (pendingChapters === 0) {
        await prisma.textbookBook.update({
          where: { id: bookId },
          data: { isApproved: true },
        });
      }

      return NextResponse.json({ success: true, message: "Đã phê duyệt chương" });
    } else if (action === "reject") {
      await prisma.textbookChapter.update({
        where: { id: chapterId },
        data: {
          isApproved: false,
          status: "REJECTED",
          rejectionReason: reason || "Rejected by admin",
        },
      });

      // Mark book as not approved
      await prisma.textbookBook.update({
        where: { id: bookId },
        data: { isApproved: false },
      });

      return NextResponse.json({ success: true, message: "Đã từ chối chương" });
    }

    return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("[Chapter Approve] POST error:", error);
    return NextResponse.json({ success: false, message: "Lỗi server" }, { status: 500 });
  }
}

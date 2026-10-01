import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ExamService } from "@/features/exams/services/ExamService";
import { getErrorMessage } from "@/lib/api";

// POST /api/exams/[id]/start — Start a new attempt
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });

    // Query the database directly to prevent stale JWT session issues
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, status: true, licenseExpiresAt: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    if (user.status === "LOCKED") {
      return NextResponse.json(
        { success: false, error: "ACCOUNT_LOCKED", message: "Tài khoản của bạn đã bị khóa." },
        { status: 403 }
      );
    }

    // Check license is active
    if (user.role !== "ADMIN" && user.licenseExpiresAt) {
      const expires = new Date(user.licenseExpiresAt);
      if (expires < new Date()) {
        return NextResponse.json(
          { success: false, error: "LICENSE_EXPIRED", message: "Gói dịch vụ của bạn đã hết hạn. Vui lòng gia hạn để tiếp tục." },
          { status: 403 }
        );
      }
    } else if (user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "NO_LICENSE", message: "Bạn chưa kích hoạt gói dịch vụ." },
        { status: 403 }
      );
    }

    const { id: examId } = await params;
    const examService = new ExamService();
    const result = await examService.startAttempt(session.user.id!, examId);

    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: "INTERNAL_SERVER_ERROR", message: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

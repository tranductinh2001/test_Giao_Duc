import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ExamService } from "@/features/exams/services/ExamService";
import { getErrorMessage } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    // Query user details from db
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        role: true,
        status: true,
        licenseExpiresAt: true,
        pricingTier: true,
      },
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

    // Check exam creation limits based on pricing tier
    if (user.role !== "ADMIN") {
      const examLimits: Record<string, number> = {
        FREE: 5,
        BASIC: 20,
        PREMIUM: 100,
        UNLIMITED: -1, // -1 means unlimited
      };

      const userLimit = examLimits[user.pricingTier] || 5;

      if (userLimit !== -1) {
        const customExamCount = await prisma.exam.count({
          where: {
            userId: session.user.id,
            isCustom: true,
          },
        });

        if (customExamCount >= userLimit) {
          return NextResponse.json(
            {
              success: false,
              error: "EXAM_LIMIT_REACHED",
              message: `Bạn đã đạt giới hạn ${userLimit} đề thi tự tạo cho gói ${user.pricingTier}. Vui lòng nâng cấp gói để tạo thêm đề.`
            },
            { status: 403 }
          );
        }
      }
    }

    const body = await req.json();
    const { title, timeLimit, matrix } = body;

    if (!title || !timeLimit || !matrix || !Array.isArray(matrix) || matrix.length === 0) {
      return NextResponse.json(
        { success: false, error: "VALIDATION_ERROR", message: "Thông tin cấu hình đề thi không hợp lệ." },
        { status: 400 }
      );
    }

    // Validate matrix items
    for (const item of matrix) {
      if (!item.categoryId || typeof item.count !== "number" || item.count < 0) {
        return NextResponse.json(
          { success: false, error: "VALIDATION_ERROR", message: "Cơ cấu chuyên đề không hợp lệ." },
          { status: 400 }
        );
      }
    }

    // Filter out zero-count categories from the matrix to avoid unnecessary DB queries
    const activeMatrix = matrix.filter((item) => item.count > 0);
    if (activeMatrix.length === 0) {
      return NextResponse.json(
        { success: false, error: "VALIDATION_ERROR", message: "Số câu hỏi thiết lập phải lớn hơn 0." },
        { status: 400 }
      );
    }

    const examService = new ExamService();
    // timeLimit is provided in minutes in UI, convert to seconds
    const timeLimitSeconds = timeLimit * 60;

    const exam = await examService.generateExamFromMatrix({
      title,
      description: "Đề ôn tập tự thiết kế bởi học viên",
      timeLimit: timeLimitSeconds,
      matrix: activeMatrix,
      isCustom: true,
      userId: session.user.id,
    });

    return NextResponse.json({ success: true, data: exam });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "INTERNAL_SERVER_ERROR", message: error.message || getErrorMessage(error) },
      { status: 500 }
    );
  }
}

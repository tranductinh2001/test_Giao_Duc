import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import { calculateBeeknoeeCost, BEEKNOEE_CONFIG, ROLE_DEFAULT_QUOTAS } from "@/lib/beeknoee-billing";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "TEACHER")) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN", message: "Ban khong co quyen truy cap tai nguyen nay." },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        licenseExpiresAt: true,
        monthlyReviewsUsed: true,
        pricingTier: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            examAttempts: true,
            bookmarks: true,
            wrongAnswers: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "NOT_FOUND", message: "Khong tim thay nguoi dung." },
        { status: 404 }
      );
    }

    const isStaff = user.role === "TEACHER";
    const isAdmin = user.role === "ADMIN";
    const quotaTotal = isAdmin
      ? ROLE_DEFAULT_QUOTAS.ADMIN.totalQuota
      : isStaff
      ? ROLE_DEFAULT_QUOTAS.TEACHER.totalQuota
      : Math.max(ROLE_DEFAULT_QUOTAS.LEARNER.totalQuota, (user.monthlyReviewsUsed || 0) + 5);

    const estimatedTokens = isAdmin ? 0 : (user.monthlyReviewsUsed || 1) * BEEKNOEE_CONFIG.ESTIMATED_TOKENS_PER_KHBD;
    const promptTokens = Math.round(estimatedTokens * 0.7);
    const completionTokens = Math.round(estimatedTokens * 0.3);
    const beeknoeeBilling = calculateBeeknoeeCost(promptTokens, completionTokens);

    return NextResponse.json({
      success: true,
      data: {
        ...user,
        reviewQuotaTotal: quotaTotal,
        reviewQuotaUsed: user.monthlyReviewsUsed || 0,
        tokensUsed: estimatedTokens,
        promptTokens,
        completionTokens,
        costUsd: beeknoeeBilling.costUsd,
        costVnd: beeknoeeBilling.costVnd,
        costFormattedUsd: beeknoeeBilling.formattedUsd,
        costFormattedVnd: beeknoeeBilling.formattedVnd,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "INTERNAL_SERVER_ERROR", message: error?.message || "Loi may chu." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "TEACHER")) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN", message: "Ban khong co quyen truy cap tai nguyen nay." },
        { status: 403 }
      );
    }

    const { id: userId } = await context.params;
    const body = await req.json();

    // ========================================================
    // TÁC VỤ 1: CẤP HẠN MỨC (GRANT QUOTA)
    // ========================================================
    if (body.action === "GRANT_QUOTA" || typeof body.addQuota === "number") {
      const addCount = Math.max(1, Math.min(100, parseInt(body.addQuota || "10", 10)));
      const targetUser = await prisma.user.findUnique({ where: { id: userId } });

      if (!targetUser) {
        return NextResponse.json(
          { success: false, error: "NOT_FOUND", message: "Không tìm thấy người dùng." },
          { status: 404 }
        );
      }

      // Ràng buộc Nhân viên: chỉ được cấp quota cho Khách hàng (LEARNER)
      if (session.user.role === "TEACHER" && targetUser.role !== "LEARNER") {
        return NextResponse.json(
          {
            success: false,
            error: "FORBIDDEN",
            message: "Nhân viên chỉ có quyền phân luồng cấp hạn mức cho Khách hàng / Học viên (LEARNER).",
          },
          { status: 403 }
        );
      }

      const newMonthlyUsed = Math.max(0, (targetUser.monthlyReviewsUsed || 0) - addCount);
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { monthlyReviewsUsed: newMonthlyUsed },
        select: { id: true, name: true, email: true, role: true, monthlyReviewsUsed: true },
      });

      return NextResponse.json({
        success: true,
        message: `Đã cấp thêm ${addCount} lượt thẩm định KHBD cho ${updated.name}.`,
        data: updated,
      });
    }

    // ========================================================
    // TÁC VỤ 2: SỬA THÔNG TIN NGƯỜI DÙNG
    // Chỉ Quản trị viên (ADMIN) mới có quyền!
    // ========================================================
    if (session.user.role === "TEACHER") {
      return NextResponse.json(
        {
          success: false,
          error: "FORBIDDEN",
          message: "Nhân viên chỉ có quyền xem và phân luồng hạn mức cho Khách hàng, không thể thay đổi thông tin người dùng, khóa tài khoản hoặc sửa vai trò.",
        },
        { status: 403 }
      );
    }

    const { name, email, password, role, status, licenseExpiresAt } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "VALIDATION_ERROR", message: "User ID la bat buoc." },
        { status: 400 }
      );
    }

    if (userId === session.user.id && status === "LOCKED") {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN", message: "Không thể tự khóa tài khoản của chính mình." },
        { status: 400 }
      );
    }

    if (userId === session.user.id && role && role !== session.user.role) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN", message: "Không thể tự thay đổi vai trò của chính mình." },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (password && password.trim()) updateData.password = await bcrypt.hash(password, 10);
    if (role) updateData.role = role;
    if (status) updateData.status = status;
    if (licenseExpiresAt !== undefined) {
      updateData.licenseExpiresAt = licenseExpiresAt ? new Date(licenseExpiresAt) : null;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        licenseExpiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "INTERNAL_SERVER_ERROR", message: error?.message || "Loi may chu." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN", message: "Ban khong co quyen truy cap tai nguyen nay." },
        { status: 403 }
      );
    }

    if (session.user.role === "TEACHER") {
      return NextResponse.json(
        {
          success: false,
          error: "FORBIDDEN",
          message: "Nhân viên không có quyền xóa người dùng. Quyền xóa tài khoản thuộc về Quản trị viên (Admin).",
        },
        { status: 403 }
      );
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN", message: "Ban khong co quyen truy cap tai nguyen nay." },
        { status: 403 }
      );
    }

    const { id: userId } = await context.params;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "VALIDATION_ERROR", message: "User ID la bat buoc." },
        { status: 400 }
      );
    }

    if (userId === session.user.id) {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN", message: "Không thể tự xóa tài khoản của chính mình." },
        { status: 400 }
      );
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({ success: true, message: "Da xoa nguoi dung thanh cong." });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "INTERNAL_SERVER_ERROR", message: error?.message || "Loi may chu." },
      { status: 500 }
    );
  }
}

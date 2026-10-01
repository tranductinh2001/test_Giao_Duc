import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// PATCH /api/admin/users/[id]/tier - Update user's pricing tier (Admin only)
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Không có quyền truy cập" },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const body = await req.json();
    const { pricingTier, subscriptionStartDate, subscriptionEndDate } = body;

    // Validate pricing tier
    const validTiers = ["FREE", "BASIC", "PREMIUM", "UNLIMITED"];
    if (!validTiers.includes(pricingTier)) {
      return NextResponse.json(
        { success: false, message: "Gói dịch vụ không hợp lệ" },
        { status: 400 }
      );
    }

    // Update user tier
    await prisma.user.update({
      where: { id },
      data: {
        pricingTier,
        subscriptionStartDate: subscriptionStartDate ? new Date(subscriptionStartDate) : null,
        subscriptionEndDate: subscriptionEndDate ? new Date(subscriptionEndDate) : null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Đã cập nhật gói dịch vụ",
    });
  } catch (error) {
    console.error("Error updating user tier:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi cập nhật gói dịch vụ" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { checkUserQuota, canUseModel, getUserMonthlyUsage } from "@/lib/usage-tracking";
import { PRICING_TIERS } from "@/lib/ai-models";

// GET /api/user/quota - Get user's quota and usage
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Chưa đăng nhập" },
        { status: 401 }
      );
    }

    const quota = await checkUserQuota(session.user.id);
    const usage = await getUserMonthlyUsage(session.user.id);
    const tier = PRICING_TIERS[quota.tier];

    return NextResponse.json({
      success: true,
      data: {
        tier: {
          name: tier.name,
          code: quota.tier,
          price: tier.price,
          features: tier.features,
        },
        quota: {
          total: quota.total,
          used: quota.total === -1 ? usage.reviewsUsed : quota.total - quota.remaining,
          remaining: quota.remaining,
          canUse: quota.canUse,
        },
        usage: {
          reviewsUsed: usage.reviewsUsed,
          totalCost: usage.totalCost,
          successfulReviews: usage.successfulReviews,
          failedReviews: usage.failedReviews,
        },
        allowedModels: tier.quota.allowedModels,
      },
    });
  } catch (error) {
    console.error("Error fetching user quota:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi lấy thông tin quota" },
      { status: 500 }
    );
  }
}

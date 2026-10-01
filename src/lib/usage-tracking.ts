import { prisma } from "@/lib/prisma";
import { PricingTier } from "@prisma/client";
import { PRICING_TIERS, type AIModelType } from "@/lib/ai-models";

/**
 * Check if user has remaining quota for this month
 */
export async function checkUserQuota(userId: string): Promise<{
  canUse: boolean;
  remaining: number;
  total: number;
  tier: PricingTier;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      pricingTier: true,
      monthlyReviewsUsed: true,
      lastResetDate: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Check if we need to reset monthly quota
  await resetQuotaIfNeeded(userId, user.lastResetDate);

  // Get fresh data after potential reset
  const freshUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { pricingTier: true, monthlyReviewsUsed: true },
  });

  if (!freshUser) {
    throw new Error("User not found");
  }

  const tier = PRICING_TIERS[freshUser.pricingTier];
  const totalQuota = tier.quota.monthlyReviews;
  const used = freshUser.monthlyReviewsUsed;

  // -1 means unlimited
  if (totalQuota === -1) {
    return {
      canUse: true,
      remaining: -1,
      total: -1,
      tier: freshUser.pricingTier,
    };
  }

  return {
    canUse: used < totalQuota,
    remaining: Math.max(0, totalQuota - used),
    total: totalQuota,
    tier: freshUser.pricingTier,
  };
}

/**
 * Increment user's monthly usage count
 */
export async function incrementUsageCount(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      monthlyReviewsUsed: {
        increment: 1,
      },
    },
  });
}

/**
 * Reset quota if it's a new month
 */
async function resetQuotaIfNeeded(userId: string, lastResetDate: Date): Promise<void> {
  const now = new Date();
  const lastReset = new Date(lastResetDate);

  // Check if we're in a different month
  const isDifferentMonth =
    now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear();

  if (isDifferentMonth) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        monthlyReviewsUsed: 0,
        lastResetDate: now,
      },
    });
  }
}

/**
 * Log AI usage for tracking and billing
 */
export async function logUsage(params: {
  userId: string;
  lessonPlanId?: string;
  operationType: "parse" | "review";
  modelUsed: AIModelType;
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
  success: boolean;
  errorMessage?: string;
}): Promise<void> {
  await prisma.usageLog.create({
    data: {
      userId: params.userId,
      lessonPlanId: params.lessonPlanId,
      operationType: params.operationType,
      modelUsed: params.modelUsed,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      totalCost: params.totalCost,
      success: params.success,
      errorMessage: params.errorMessage,
    },
  });
}

/**
 * Get user's usage statistics for current month
 */
export async function getUserMonthlyUsage(userId: string): Promise<{
  reviewsUsed: number;
  totalCost: number;
  successfulReviews: number;
  failedReviews: number;
}> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const logs = await prisma.usageLog.findMany({
    where: {
      userId,
      createdAt: {
        gte: startOfMonth,
      },
    },
    select: {
      totalCost: true,
      success: true,
    },
  });

  return {
    reviewsUsed: logs.length,
    totalCost: logs.reduce((sum, log) => sum + log.totalCost, 0),
    successfulReviews: logs.filter((log) => log.success).length,
    failedReviews: logs.filter((log) => !log.success).length,
  };
}

/**
 * Check if user can use a specific model based on their tier
 */
export async function canUseModel(
  userId: string,
  modelType: AIModelType
): Promise<{
  canUse: boolean;
  reason?: string;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { pricingTier: true },
  });

  if (!user) {
    return { canUse: false, reason: "User not found" };
  }

  const tier = PRICING_TIERS[user.pricingTier];
  const allowedModels = tier.quota.allowedModels;

  if (!allowedModels.includes(modelType)) {
    return {
      canUse: false,
      reason: `Model ${modelType} không khả dụng cho gói ${tier.name}. Vui lòng nâng cấp gói dịch vụ.`,
    };
  }

  return { canUse: true };
}

/**
 * Get usage statistics for admin dashboard
 */
export async function getSystemUsageStats(params?: {
  startDate?: Date;
  endDate?: Date;
}): Promise<{
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalCost: number;
  averageCostPerRequest: number;
  mostUsedModel: string;
  requestsByModel: Record<string, number>;
}> {
  const where = params
    ? {
        createdAt: {
          gte: params.startDate,
          lte: params.endDate,
        },
      }
    : {};

  const logs = await prisma.usageLog.findMany({
    where,
    select: {
      totalCost: true,
      success: true,
      modelUsed: true,
    },
  });

  const totalRequests = logs.length;
  const successfulRequests = logs.filter((log) => log.success).length;
  const failedRequests = totalRequests - successfulRequests;
  const totalCost = logs.reduce((sum, log) => sum + log.totalCost, 0);

  // Count requests by model
  const requestsByModel: Record<string, number> = {};
  logs.forEach((log) => {
    requestsByModel[log.modelUsed] = (requestsByModel[log.modelUsed] || 0) + 1;
  });

  // Find most used model
  let mostUsedModel = "";
  let maxCount = 0;
  Object.entries(requestsByModel).forEach(([model, count]) => {
    if (count > maxCount) {
      maxCount = count;
      mostUsedModel = model;
    }
  });

  return {
    totalRequests,
    successfulRequests,
    failedRequests,
    totalCost,
    averageCostPerRequest: totalRequests > 0 ? totalCost / totalRequests : 0,
    mostUsedModel,
    requestsByModel,
  };
}

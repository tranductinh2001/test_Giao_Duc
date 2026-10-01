-- Add pricing tier enums and fields
CREATE TYPE "PricingTier" AS ENUM ('FREE', 'BASIC', 'PREMIUM', 'UNLIMITED');

-- Add pricing tier to User table
ALTER TABLE "User" ADD COLUMN "pricingTier" "PricingTier" NOT NULL DEFAULT 'FREE';
ALTER TABLE "User" ADD COLUMN "subscriptionStartDate" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "subscriptionEndDate" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "monthlyReviewsUsed" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "lastResetDate" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

-- Create UsageLog table for tracking AI usage
CREATE TABLE "UsageLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonPlanId" TEXT,
    "operationType" TEXT NOT NULL, -- 'parse' or 'review'
    "modelUsed" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageLog_pkey" PRIMARY KEY ("id")
);

-- Create SystemConfig table for admin configurations
CREATE TABLE "SystemConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- Create EvaluationCriteria table for công văn 5512
CREATE TABLE "EvaluationCriteria" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "level" TEXT NOT NULL, -- 'C1', 'C2', etc
    "category" TEXT NOT NULL, -- 'objectives', 'content', 'method', etc
    "description" TEXT,
    "maxScore" DOUBLE PRECISION NOT NULL,
    "criteria" JSONB NOT NULL, -- Chi tiết tiêu chí
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvaluationCriteria_pkey" PRIMARY KEY ("id")
);

-- Add foreign keys
ALTER TABLE "UsageLog" ADD CONSTRAINT "UsageLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UsageLog" ADD CONSTRAINT "UsageLog_lessonPlanId_fkey" FOREIGN KEY ("lessonPlanId") REFERENCES "LessonPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create indexes
CREATE INDEX "UsageLog_userId_idx" ON "UsageLog"("userId");
CREATE INDEX "UsageLog_createdAt_idx" ON "UsageLog"("createdAt");
CREATE INDEX "UsageLog_userId_createdAt_idx" ON "UsageLog"("userId", "createdAt");
CREATE UNIQUE INDEX "SystemConfig_key_key" ON "SystemConfig"("key");
CREATE UNIQUE INDEX "EvaluationCriteria_code_key" ON "EvaluationCriteria"("code");
CREATE INDEX "EvaluationCriteria_level_idx" ON "EvaluationCriteria"("level");
CREATE INDEX "EvaluationCriteria_isActive_idx" ON "EvaluationCriteria"("isActive");

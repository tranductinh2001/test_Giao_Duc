-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SectionType" ADD VALUE 'TEACHING_EQUIPMENT';
ALTER TYPE "SectionType" ADD VALUE 'LEARNING_MATERIALS';
ALTER TYPE "SectionType" ADD VALUE 'WARM_UP';
ALTER TYPE "SectionType" ADD VALUE 'KNOWLEDGE_FORMATION';
ALTER TYPE "SectionType" ADD VALUE 'PRACTICE';
ALTER TYPE "SectionType" ADD VALUE 'APPLICATION';
ALTER TYPE "SectionType" ADD VALUE 'HOMEWORK';

-- CreateTable
CREATE TABLE "SectionRule" (
    "id" TEXT NOT NULL,
    "sectionType" "SectionType" NOT NULL,
    "title" TEXT NOT NULL,
    "requirements" TEXT NOT NULL,
    "correctExample" TEXT,
    "incorrectExample" TEXT,
    "aiPrompt" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SectionRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SectionRule_sectionType_idx" ON "SectionRule"("sectionType");

-- CreateIndex
CREATE INDEX "SectionRule_isActive_idx" ON "SectionRule"("isActive");

-- CreateIndex
CREATE INDEX "SectionRule_priority_idx" ON "SectionRule"("priority");

-- CreateIndex
CREATE INDEX "SectionRule_sectionType_isActive_idx" ON "SectionRule"("sectionType", "isActive");

-- AddForeignKey
ALTER TABLE "SectionRule" ADD CONSTRAINT "SectionRule_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

/*
  Warnings:

  - Changed the type of `sectionType` on the `LessonPlanSection` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `sectionType` on the `SectionRule` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "AIRequest" ALTER COLUMN "ruleSetId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "LessonPlanSection" ALTER COLUMN "sectionType" TYPE text USING "sectionType"::text;

-- AlterTable
ALTER TABLE "ReviewResult" ALTER COLUMN "ruleSetId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "SectionRule" ALTER COLUMN "sectionType" TYPE text USING "sectionType"::text;

-- DropEnum
DROP TYPE IF EXISTS "SectionType";

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LessonPlanSection_sectionType_idx" ON "LessonPlanSection"("sectionType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SectionRule_sectionType_idx" ON "SectionRule"("sectionType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SectionRule_sectionType_isActive_idx" ON "SectionRule"("sectionType", "isActive");

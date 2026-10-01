-- Add new columns to TeachingMethod table
ALTER TABLE "TeachingMethod" ADD COLUMN IF NOT EXISTS "keywords" TEXT;
ALTER TABLE "TeachingMethod" ADD COLUMN IF NOT EXISTS "indicators" TEXT;
ALTER TABLE "TeachingMethod" ADD COLUMN IF NOT EXISTS "criteria" TEXT;
ALTER TABLE "TeachingMethod" ADD COLUMN IF NOT EXISTS "improvementSuggestions" TEXT;

-- Create TeachingMethodGradeLevel table
CREATE TABLE IF NOT EXISTS "TeachingMethodGradeLevel" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "teachingMethodId" TEXT NOT NULL,
  "gradeCode" TEXT NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  UNIQUE("teachingMethodId", "gradeCode")
);

-- Create TeachingMethodSubject table
CREATE TABLE IF NOT EXISTS "TeachingMethodSubject" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "teachingMethodId" TEXT NOT NULL,
  "subjectCode" TEXT NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  UNIQUE("teachingMethodId", "subjectCode")
);

-- Create TeachingMethodActivity table
CREATE TABLE IF NOT EXISTS "TeachingMethodActivity" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "teachingMethodId" TEXT NOT NULL,
  "activityType" TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  "isRecommended" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  UNIQUE("teachingMethodId", "activityType")
);

-- Add foreign key constraints
ALTER TABLE "TeachingMethodGradeLevel" ADD CONSTRAINT "TeachingMethodGradeLevel_teachingMethodId_fkey" FOREIGN KEY ("teachingMethodId") REFERENCES "TeachingMethod"(id) ON DELETE CASCADE;
ALTER TABLE "TeachingMethodSubject" ADD CONSTRAINT "TeachingMethodSubject_teachingMethodId_fkey" FOREIGN KEY ("teachingMethodId") REFERENCES "TeachingMethod"(id) ON DELETE CASCADE;
ALTER TABLE "TeachingMethodActivity" ADD CONSTRAINT "TeachingMethodActivity_teachingMethodId_fkey" FOREIGN KEY ("teachingMethodId") REFERENCES "TeachingMethod"(id) ON DELETE CASCADE;

-- Create indexes
CREATE INDEX IF NOT EXISTS "TeachingMethodGradeLevel_teachingMethodId_idx" ON "TeachingMethodGradeLevel"("teachingMethodId");
CREATE INDEX IF NOT EXISTS "TeachingMethodGradeLevel_gradeCode_idx" ON "TeachingMethodGradeLevel"("gradeCode");
CREATE INDEX IF NOT EXISTS "TeachingMethodSubject_teachingMethodId_idx" ON "TeachingMethodSubject"("teachingMethodId");
CREATE INDEX IF NOT EXISTS "TeachingMethodSubject_subjectCode_idx" ON "TeachingMethodSubject"("subjectCode");
CREATE INDEX IF NOT EXISTS "TeachingMethodActivity_teachingMethodId_idx" ON "TeachingMethodActivity"("teachingMethodId");
CREATE INDEX IF NOT EXISTS "TeachingMethodActivity_activityType_idx" ON "TeachingMethodActivity"("activityType");

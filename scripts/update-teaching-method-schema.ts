import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/education";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    console.log("Adding new columns to TeachingMethod table...");

    // Add new columns to TeachingMethod table if they don't exist
    await prisma.$executeRaw`ALTER TABLE "TeachingMethod" ADD COLUMN IF NOT EXISTS "keywords" TEXT`;
    await prisma.$executeRaw`ALTER TABLE "TeachingMethod" ADD COLUMN IF NOT EXISTS "indicators" TEXT`;
    await prisma.$executeRaw`ALTER TABLE "TeachingMethod" ADD COLUMN IF NOT EXISTS "criteria" TEXT`;
    await prisma.$executeRaw`ALTER TABLE "TeachingMethod" ADD COLUMN IF NOT EXISTS "improvementSuggestions" TEXT`;

    console.log("Creating TeachingMethodGradeLevel table...");
    await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS "TeachingMethodGradeLevel" (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      "teachingMethodId" TEXT NOT NULL,
      "gradeCode" TEXT NOT NULL,
      "createdAt" TIMESTAMP DEFAULT NOW(),
      "updatedAt" TIMESTAMP DEFAULT NOW(),
      UNIQUE("teachingMethodId", "gradeCode")
    )`;

    console.log("Creating TeachingMethodSubject table...");
    await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS "TeachingMethodSubject" (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      "teachingMethodId" TEXT NOT NULL,
      "subjectCode" TEXT NOT NULL,
      "createdAt" TIMESTAMP DEFAULT NOW(),
      "updatedAt" TIMESTAMP DEFAULT NOW(),
      UNIQUE("teachingMethodId", "subjectCode")
    )`;

    console.log("Creating TeachingMethodActivity table...");
    await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS "TeachingMethodActivity" (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      "teachingMethodId" TEXT NOT NULL,
      "activityType" TEXT NOT NULL,
      priority INTEGER DEFAULT 0,
      "isRecommended" BOOLEAN DEFAULT false,
      "createdAt" TIMESTAMP DEFAULT NOW(),
      "updatedAt" TIMESTAMP DEFAULT NOW(),
      UNIQUE("teachingMethodId", "activityType")
    )`;

    console.log("Adding foreign key constraints...");
    await prisma.$executeRaw`ALTER TABLE "TeachingMethodGradeLevel" ADD CONSTRAINT "TeachingMethodGradeLevel_teachingMethodId_fkey" FOREIGN KEY ("teachingMethodId") REFERENCES "TeachingMethod"(id) ON DELETE CASCADE`;
    await prisma.$executeRaw`ALTER TABLE "TeachingMethodSubject" ADD CONSTRAINT "TeachingMethodSubject_teachingMethodId_fkey" FOREIGN KEY ("teachingMethodId") REFERENCES "TeachingMethod"(id) ON DELETE CASCADE`;
    await prisma.$executeRaw`ALTER TABLE "TeachingMethodActivity" ADD CONSTRAINT "TeachingMethodActivity_teachingMethodId_fkey" FOREIGN KEY ("teachingMethodId") REFERENCES "TeachingMethod"(id) ON DELETE CASCADE`;

    console.log("Creating indexes...");
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "TeachingMethodGradeLevel_teachingMethodId_idx" ON "TeachingMethodGradeLevel"("teachingMethodId")`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "TeachingMethodGradeLevel_gradeCode_idx" ON "TeachingMethodGradeLevel"("gradeCode")`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "TeachingMethodSubject_teachingMethodId_idx" ON "TeachingMethodSubject"("teachingMethodId")`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "TeachingMethodSubject_subjectCode_idx" ON "TeachingMethodSubject"("subjectCode")`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "TeachingMethodActivity_teachingMethodId_idx" ON "TeachingMethodActivity"("teachingMethodId")`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "TeachingMethodActivity_activityType_idx" ON "TeachingMethodActivity"("activityType")`;

    console.log("Schema updated successfully!");
  } catch (e: any) {
    console.error("Error:", e.message);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();

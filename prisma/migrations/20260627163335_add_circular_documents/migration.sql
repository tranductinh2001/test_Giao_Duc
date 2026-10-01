-- CreateEnum
CREATE TYPE "CircularType" AS ENUM ('GUIDELINE', 'REGULATION', 'STANDARD', 'CURRICULUM');

-- CreateTable
CREATE TABLE "CircularDocument" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "CircularType" NOT NULL DEFAULT 'GUIDELINE',
    "content" TEXT NOT NULL,
    "summary" TEXT,
    "issuedDate" TIMESTAMP(3) NOT NULL,
    "effectiveDate" TIMESTAMP(3),
    "applicableLevel" TEXT[],
    "applicableSubjects" TEXT[],
    "fileUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CircularDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CircularDocument_code_key" ON "CircularDocument"("code");

-- CreateIndex
CREATE INDEX "CircularDocument_code_idx" ON "CircularDocument"("code");

-- CreateIndex
CREATE INDEX "CircularDocument_isActive_idx" ON "CircularDocument"("isActive");

-- CreateIndex
CREATE INDEX "CircularDocument_applicableLevel_idx" ON "CircularDocument"("applicableLevel");

-- CreateTable
CREATE TABLE "CircularSectionRequirement" (
    "id" TEXT NOT NULL,
    "circularId" TEXT NOT NULL,
    "sectionType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "requirements" TEXT NOT NULL,
    "correctExample" TEXT,
    "incorrectExample" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CircularSectionRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CircularSectionRequirement_circularId_idx" ON "CircularSectionRequirement"("circularId");

-- CreateIndex
CREATE INDEX "CircularSectionRequirement_sectionType_idx" ON "CircularSectionRequirement"("sectionType");

-- CreateIndex
CREATE INDEX "CircularSectionRequirement_isActive_idx" ON "CircularSectionRequirement"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CircularSectionRequirement_circularId_sectionType_key" ON "CircularSectionRequirement"("circularId", "sectionType");

-- AddForeignKey
ALTER TABLE "CircularSectionRequirement" ADD CONSTRAINT "CircularSectionRequirement_circularId_fkey" FOREIGN KEY ("circularId") REFERENCES "CircularDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

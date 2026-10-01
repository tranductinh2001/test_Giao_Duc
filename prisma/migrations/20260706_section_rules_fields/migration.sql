-- Section Rules Additional Fields Migration
-- Add level, order, and parentId to SectionRule for hierarchical structure

-- Add missing fields to SectionRule (circularId already exists)
ALTER TABLE "SectionRule" ADD COLUMN IF NOT EXISTS "level" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "SectionRule" ADD COLUMN IF NOT EXISTS "order" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "SectionRule" ADD COLUMN IF NOT EXISTS "parentId" TEXT;

-- Add foreign key for SectionRule self-referencing (hierarchy)
ALTER TABLE "SectionRule" ADD CONSTRAINT "SectionRule_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "SectionRule"("id") ON DELETE SET NULL;

-- Create indexes for new fields
CREATE INDEX IF NOT EXISTS "SectionRule_parentId_idx" ON "SectionRule"("parentId");
CREATE INDEX IF NOT EXISTS "SectionRule_level_idx" ON "SectionRule"("level");
CREATE INDEX IF NOT EXISTS "SectionRule_order_idx" ON "SectionRule"("order");

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS "SectionRule_circularId_isActive_idx" ON "SectionRule"("circularId", "isActive");
CREATE INDEX IF NOT EXISTS "SectionRule_sectionType_circularId_idx" ON "SectionRule"("sectionType", "circularId");

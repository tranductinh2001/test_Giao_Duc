-- Add hierarchy support to rule_template_sections
-- Migration: add_section_hierarchy
-- Date: 2026-07-02

-- Add parentId column
ALTER TABLE "rule_template_sections" ADD COLUMN "parentId" TEXT;

-- Add level column with default
ALTER TABLE "rule_template_sections" ADD COLUMN "level" INTEGER NOT NULL DEFAULT 1;

-- Add foreign key for self-referencing relation
ALTER TABLE "rule_template_sections"
ADD CONSTRAINT "rule_template_sections_parentId_fkey"
FOREIGN KEY ("parentId")
REFERENCES "rule_template_sections"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- Add index on parentId for performance
CREATE INDEX "rule_template_sections_parentId_idx" ON "rule_template_sections"("parentId");

-- Update existing sections to have level = 1 (already handled by DEFAULT)
-- No data migration needed as all existing sections are root level

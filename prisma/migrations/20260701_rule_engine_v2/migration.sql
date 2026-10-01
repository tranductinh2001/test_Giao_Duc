-- Rule Engine v2.0 Migration
-- Template-driven, Rule-based system with AI fallback

-- Create enums
CREATE TYPE "RuleSeverity" AS ENUM ('ERROR', 'WARNING', 'INFO');
CREATE TYPE "ParserType" AS ENUM ('KEYWORD', 'REGEX', 'FUZZY');
CREATE TYPE "StructureCheckType" AS ENUM ('HEADING', 'NUMBERING', 'FORMAT', 'ORDER', 'STYLE');
CREATE TYPE "ContentCheckType" AS ENUM ('PRESENCE', 'QUALITY', 'COMPLETENESS');
CREATE TYPE "FixType" AS ENUM ('TEMPLATE', 'AI_ASSISTED', 'MANUAL');
CREATE TYPE "FeedbackType" AS ENUM ('CORRECT', 'INCORRECT', 'IMPROVED');

-- Create rule_templates table
CREATE TABLE "rule_templates" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rule_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "rule_templates_code_key" ON "rule_templates"("code");
CREATE INDEX "rule_templates_code_idx" ON "rule_templates"("code");
CREATE INDEX "rule_templates_isActive_idx" ON "rule_templates"("isActive");

-- Create rule_template_sections table
CREATE TABLE "rule_template_sections" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "isRepeatable" BOOLEAN NOT NULL DEFAULT false,
    "numberingStyle" TEXT,
    "headingLevel" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rule_template_sections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "rule_template_sections_templateId_code_key" ON "rule_template_sections"("templateId", "code");
CREATE INDEX "rule_template_sections_templateId_order_idx" ON "rule_template_sections"("templateId", "order");

-- Create section_parser_rules table
CREATE TABLE "section_parser_rules" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "type" "ParserType" NOT NULL,
    "pattern" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "ignoreCase" BOOLEAN NOT NULL DEFAULT true,
    "ignoreAccent" BOOLEAN NOT NULL DEFAULT true,
    "ignoreSpace" BOOLEAN NOT NULL DEFAULT false,
    "normalizeText" BOOLEAN NOT NULL DEFAULT true,
    "fuzzyThreshold" DOUBLE PRECISION,
    "aliases" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "learnedFromAI" BOOLEAN NOT NULL DEFAULT false,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "section_parser_rules_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "section_parser_rules_templateId_type_idx" ON "section_parser_rules"("templateId", "type");
CREATE INDEX "section_parser_rules_sectionId_idx" ON "section_parser_rules"("sectionId");
CREATE INDEX "section_parser_rules_priority_idx" ON "section_parser_rules"("priority");

-- Create section_structure_rules table
CREATE TABLE "section_structure_rules" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "sectionId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "StructureCheckType" NOT NULL,
    "severity" "RuleSeverity" NOT NULL,
    "expectedValue" JSONB,
    "allowedValues" JSONB,
    "penaltyScore" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "suggestionText" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "section_structure_rules_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "section_structure_rules_templateId_type_idx" ON "section_structure_rules"("templateId", "type");
CREATE INDEX "section_structure_rules_severity_idx" ON "section_structure_rules"("severity");

-- Create section_content_rules table
CREATE TABLE "section_content_rules" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "checkType" "ContentCheckType" NOT NULL,
    "severity" "RuleSeverity" NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "userPrompt" TEXT NOT NULL,
    "criteria" JSONB,
    "penaltyScore" INTEGER NOT NULL DEFAULT 0,
    "useAI" BOOLEAN NOT NULL DEFAULT true,
    "aiModel" TEXT NOT NULL DEFAULT 'gemini-2.0-flash-exp',
    "maxTokens" INTEGER DEFAULT 500,
    "temperature" DOUBLE PRECISION DEFAULT 0.3,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "section_content_rules_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "section_content_rules_templateId_sectionId_idx" ON "section_content_rules"("templateId", "sectionId");
CREATE INDEX "section_content_rules_checkType_idx" ON "section_content_rules"("checkType");

-- Create section_fix_rules table
CREATE TABLE "section_fix_rules" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "issueType" TEXT NOT NULL,
    "issueSeverity" "RuleSeverity" NOT NULL,
    "fixType" "FixType" NOT NULL,
    "fixTemplate" TEXT,
    "aiPrompt" TEXT,
    "aiModel" TEXT DEFAULT 'gemini-2.0-flash-exp',
    "instructions" TEXT,
    "autoApply" BOOLEAN NOT NULL DEFAULT false,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "section_fix_rules_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "section_fix_rules_templateId_issueType_idx" ON "section_fix_rules"("templateId", "issueType");

-- Create section_scoring_rules table
CREATE TABLE "section_scoring_rules" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "issueType" TEXT NOT NULL,
    "severity" "RuleSeverity" NOT NULL,
    "penalty" INTEGER NOT NULL,
    "conditions" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "section_scoring_rules_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "section_scoring_rules_templateId_issueType_idx" ON "section_scoring_rules"("templateId", "issueType");
CREATE INDEX "section_scoring_rules_severity_idx" ON "section_scoring_rules"("severity");

-- Create rule_change_versions table
CREATE TABLE "rule_change_versions" (
    "id" TEXT NOT NULL,
    "ruleType" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "changedBy" TEXT,
    "changeNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rule_change_versions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "rule_change_versions_ruleType_ruleId_idx" ON "rule_change_versions"("ruleType", "ruleId");
CREATE INDEX "rule_change_versions_version_idx" ON "rule_change_versions"("version");

-- Create rule_usage_history table
CREATE TABLE "rule_usage_history" (
    "id" TEXT NOT NULL,
    "ruleType" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "lessonPlanId" TEXT NOT NULL,
    "sectionId" TEXT,
    "matched" BOOLEAN NOT NULL,
    "confidence" DOUBLE PRECISION,
    "aiUsed" BOOLEAN NOT NULL DEFAULT false,
    "executionTime" INTEGER,
    "userFeedback" "FeedbackType",
    "improvedRuleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rule_usage_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "rule_usage_history_ruleId_matched_idx" ON "rule_usage_history"("ruleId", "matched");
CREATE INDEX "rule_usage_history_lessonPlanId_idx" ON "rule_usage_history"("lessonPlanId");
CREATE INDEX "rule_usage_history_aiUsed_idx" ON "rule_usage_history"("aiUsed");

-- Add foreign keys
ALTER TABLE "rule_template_sections" ADD CONSTRAINT "rule_template_sections_templateId_fkey"
    FOREIGN KEY ("templateId") REFERENCES "rule_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "section_parser_rules" ADD CONSTRAINT "section_parser_rules_templateId_fkey"
    FOREIGN KEY ("templateId") REFERENCES "rule_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "section_parser_rules" ADD CONSTRAINT "section_parser_rules_sectionId_fkey"
    FOREIGN KEY ("sectionId") REFERENCES "rule_template_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "section_structure_rules" ADD CONSTRAINT "section_structure_rules_templateId_fkey"
    FOREIGN KEY ("templateId") REFERENCES "rule_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "section_structure_rules" ADD CONSTRAINT "section_structure_rules_sectionId_fkey"
    FOREIGN KEY ("sectionId") REFERENCES "rule_template_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "section_content_rules" ADD CONSTRAINT "section_content_rules_templateId_fkey"
    FOREIGN KEY ("templateId") REFERENCES "rule_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "section_content_rules" ADD CONSTRAINT "section_content_rules_sectionId_fkey"
    FOREIGN KEY ("sectionId") REFERENCES "rule_template_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "section_fix_rules" ADD CONSTRAINT "section_fix_rules_templateId_fkey"
    FOREIGN KEY ("templateId") REFERENCES "rule_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "section_scoring_rules" ADD CONSTRAINT "section_scoring_rules_templateId_fkey"
    FOREIGN KEY ("templateId") REFERENCES "rule_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

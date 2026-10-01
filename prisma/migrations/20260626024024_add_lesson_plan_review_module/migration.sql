-- CreateEnum
CREATE TYPE "LessonPlanStatus" AS ENUM ('UPLOADED', 'PARSING', 'PARSED', 'REVIEWING', 'REVIEWED', 'EDITING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "SectionType" AS ENUM ('HEADER', 'OBJECTIVES', 'PREPARATION', 'TEACHING_PROCESS', 'EVALUATION', 'APPENDIX', 'OTHER');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('TEXT', 'TABLE', 'LIST', 'IMAGE');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('DRAFT', 'COMPLETED', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AnnotationType" AS ENUM ('COMMENT', 'WARNING', 'SUGGESTION', 'ERROR', 'IMPROVEMENT');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('INFO', 'WARNING', 'ERROR', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AnnotationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "AIRequestType" AS ENUM ('PARSE', 'REVIEW', 'ANNOTATE', 'SUGGEST');

-- CreateEnum
CREATE TYPE "AIRequestStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CACHED');

-- CreateEnum
CREATE TYPE "ExportFormat" AS ENUM ('DOCX', 'PDF');

-- CreateEnum
CREATE TYPE "ReviewActionType" AS ENUM ('CREATED', 'PARSED', 'REVIEWED', 'EDITED', 'ANNOTATION_ADDED', 'ANNOTATION_ACCEPTED', 'ANNOTATION_REJECTED', 'EXPORTED', 'COMPLETED');

-- CreateTable
CREATE TABLE "LessonPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subject" TEXT,
    "gradeLevel" TEXT,
    "schoolYear" TEXT,
    "originalFilename" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" BIGINT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "status" "LessonPlanStatus" NOT NULL DEFAULT 'UPLOADED',
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "LessonPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonPlanVersion" (
    "id" TEXT NOT NULL,
    "lessonPlanId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" BIGINT NOT NULL,
    "changeSummary" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonPlanVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonPlanSection" (
    "id" TEXT NOT NULL,
    "lessonPlanId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "sectionType" "SectionType" NOT NULL,
    "sectionTitle" TEXT,
    "sectionOrder" INTEGER NOT NULL,
    "contentType" "ContentType" NOT NULL DEFAULT 'TEXT',
    "rawContent" TEXT NOT NULL,
    "parsedContent" JSONB,
    "wordCount" INTEGER,
    "charCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonPlanSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewRuleSet" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "code" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "scope" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewRuleSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewRule" (
    "id" TEXT NOT NULL,
    "ruleSetId" TEXT NOT NULL,
    "ruleCode" TEXT NOT NULL,
    "ruleName" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "severity" "Severity" NOT NULL DEFAULT 'WARNING',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "applicableSections" JSONB,
    "aiPrompt" TEXT NOT NULL,
    "validationCriteria" JSONB,
    "correctExamples" TEXT,
    "incorrectExamples" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIRequest" (
    "id" TEXT NOT NULL,
    "lessonPlanId" TEXT NOT NULL,
    "sectionId" TEXT,
    "ruleSetId" TEXT NOT NULL,
    "requestType" "AIRequestType" NOT NULL,
    "prompt" TEXT NOT NULL,
    "inputTokens" INTEGER,
    "modelName" TEXT NOT NULL DEFAULT 'gemini-1.5-pro',
    "status" "AIRequestStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "cacheKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AIRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIResponse" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "responseData" JSONB NOT NULL,
    "outputTokens" INTEGER,
    "processingTimeMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewResult" (
    "id" TEXT NOT NULL,
    "lessonPlanId" TEXT NOT NULL,
    "ruleSetId" TEXT NOT NULL,
    "overallScore" DECIMAL(5,2),
    "totalIssues" INTEGER NOT NULL DEFAULT 0,
    "criticalIssues" INTEGER NOT NULL DEFAULT 0,
    "errorIssues" INTEGER NOT NULL DEFAULT 0,
    "warningIssues" INTEGER NOT NULL DEFAULT 0,
    "infoIssues" INTEGER NOT NULL DEFAULT 0,
    "strengths" JSONB,
    "weaknesses" JSONB,
    "missingContent" JSONB,
    "suggestions" JSONB,
    "status" "ReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Annotation" (
    "id" TEXT NOT NULL,
    "reviewResultId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "ruleId" TEXT,
    "annotationType" "AnnotationType" NOT NULL,
    "severity" "Severity" NOT NULL,
    "startPosition" INTEGER NOT NULL,
    "endPosition" INTEGER NOT NULL,
    "highlightedText" TEXT,
    "message" TEXT NOT NULL,
    "explanation" TEXT,
    "suggestion" TEXT,
    "proposedContent" TEXT,
    "status" "AnnotationStatus" NOT NULL DEFAULT 'PENDING',
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Annotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExportHistory" (
    "id" TEXT NOT NULL,
    "lessonPlanId" TEXT NOT NULL,
    "reviewResultId" TEXT,
    "exportFormat" "ExportFormat" NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" BIGINT NOT NULL,
    "includeAnnotations" BOOLEAN NOT NULL DEFAULT true,
    "includeTrackChanges" BOOLEAN NOT NULL DEFAULT true,
    "exportedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExportHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewHistory" (
    "id" TEXT NOT NULL,
    "lessonPlanId" TEXT NOT NULL,
    "reviewResultId" TEXT,
    "actionType" "ReviewActionType" NOT NULL,
    "actionData" JSONB,
    "performedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LessonPlan_userId_idx" ON "LessonPlan"("userId");

-- CreateIndex
CREATE INDEX "LessonPlan_status_idx" ON "LessonPlan"("status");

-- CreateIndex
CREATE INDEX "LessonPlan_createdAt_idx" ON "LessonPlan"("createdAt");

-- CreateIndex
CREATE INDEX "LessonPlan_deletedAt_idx" ON "LessonPlan"("deletedAt");

-- CreateIndex
CREATE INDEX "LessonPlanVersion_lessonPlanId_idx" ON "LessonPlanVersion"("lessonPlanId");

-- CreateIndex
CREATE UNIQUE INDEX "LessonPlanVersion_lessonPlanId_versionNumber_key" ON "LessonPlanVersion"("lessonPlanId", "versionNumber");

-- CreateIndex
CREATE INDEX "LessonPlanSection_lessonPlanId_idx" ON "LessonPlanSection"("lessonPlanId");

-- CreateIndex
CREATE INDEX "LessonPlanSection_sectionType_idx" ON "LessonPlanSection"("sectionType");

-- CreateIndex
CREATE INDEX "LessonPlanSection_sectionOrder_idx" ON "LessonPlanSection"("sectionOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewRuleSet_code_key" ON "ReviewRuleSet"("code");

-- CreateIndex
CREATE INDEX "ReviewRuleSet_code_idx" ON "ReviewRuleSet"("code");

-- CreateIndex
CREATE INDEX "ReviewRuleSet_isActive_idx" ON "ReviewRuleSet"("isActive");

-- CreateIndex
CREATE INDEX "ReviewRuleSet_isDefault_idx" ON "ReviewRuleSet"("isDefault");

-- CreateIndex
CREATE INDEX "ReviewRule_ruleSetId_idx" ON "ReviewRule"("ruleSetId");

-- CreateIndex
CREATE INDEX "ReviewRule_category_idx" ON "ReviewRule"("category");

-- CreateIndex
CREATE INDEX "ReviewRule_severity_idx" ON "ReviewRule"("severity");

-- CreateIndex
CREATE INDEX "ReviewRule_priority_idx" ON "ReviewRule"("priority");

-- CreateIndex
CREATE INDEX "ReviewRule_isActive_idx" ON "ReviewRule"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewRule_ruleSetId_ruleCode_key" ON "ReviewRule"("ruleSetId", "ruleCode");

-- CreateIndex
CREATE INDEX "AIRequest_lessonPlanId_idx" ON "AIRequest"("lessonPlanId");

-- CreateIndex
CREATE INDEX "AIRequest_sectionId_idx" ON "AIRequest"("sectionId");

-- CreateIndex
CREATE INDEX "AIRequest_status_idx" ON "AIRequest"("status");

-- CreateIndex
CREATE INDEX "AIRequest_cacheKey_idx" ON "AIRequest"("cacheKey");

-- CreateIndex
CREATE INDEX "AIRequest_createdAt_idx" ON "AIRequest"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AIResponse_requestId_key" ON "AIResponse"("requestId");

-- CreateIndex
CREATE INDEX "ReviewResult_lessonPlanId_idx" ON "ReviewResult"("lessonPlanId");

-- CreateIndex
CREATE INDEX "ReviewResult_ruleSetId_idx" ON "ReviewResult"("ruleSetId");

-- CreateIndex
CREATE INDEX "ReviewResult_status_idx" ON "ReviewResult"("status");

-- CreateIndex
CREATE INDEX "ReviewResult_overallScore_idx" ON "ReviewResult"("overallScore");

-- CreateIndex
CREATE INDEX "Annotation_reviewResultId_idx" ON "Annotation"("reviewResultId");

-- CreateIndex
CREATE INDEX "Annotation_sectionId_idx" ON "Annotation"("sectionId");

-- CreateIndex
CREATE INDEX "Annotation_ruleId_idx" ON "Annotation"("ruleId");

-- CreateIndex
CREATE INDEX "Annotation_annotationType_idx" ON "Annotation"("annotationType");

-- CreateIndex
CREATE INDEX "Annotation_severity_idx" ON "Annotation"("severity");

-- CreateIndex
CREATE INDEX "Annotation_status_idx" ON "Annotation"("status");

-- CreateIndex
CREATE INDEX "ExportHistory_lessonPlanId_idx" ON "ExportHistory"("lessonPlanId");

-- CreateIndex
CREATE INDEX "ExportHistory_reviewResultId_idx" ON "ExportHistory"("reviewResultId");

-- CreateIndex
CREATE INDEX "ExportHistory_exportedBy_idx" ON "ExportHistory"("exportedBy");

-- CreateIndex
CREATE INDEX "ExportHistory_createdAt_idx" ON "ExportHistory"("createdAt");

-- CreateIndex
CREATE INDEX "ReviewHistory_lessonPlanId_idx" ON "ReviewHistory"("lessonPlanId");

-- CreateIndex
CREATE INDEX "ReviewHistory_reviewResultId_idx" ON "ReviewHistory"("reviewResultId");

-- CreateIndex
CREATE INDEX "ReviewHistory_actionType_idx" ON "ReviewHistory"("actionType");

-- CreateIndex
CREATE INDEX "ReviewHistory_performedBy_idx" ON "ReviewHistory"("performedBy");

-- CreateIndex
CREATE INDEX "ReviewHistory_createdAt_idx" ON "ReviewHistory"("createdAt");

-- AddForeignKey
ALTER TABLE "LessonPlan" ADD CONSTRAINT "LessonPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonPlanVersion" ADD CONSTRAINT "LessonPlanVersion_lessonPlanId_fkey" FOREIGN KEY ("lessonPlanId") REFERENCES "LessonPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonPlanVersion" ADD CONSTRAINT "LessonPlanVersion_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonPlanSection" ADD CONSTRAINT "LessonPlanSection_lessonPlanId_fkey" FOREIGN KEY ("lessonPlanId") REFERENCES "LessonPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewRuleSet" ADD CONSTRAINT "ReviewRuleSet_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewRule" ADD CONSTRAINT "ReviewRule_ruleSetId_fkey" FOREIGN KEY ("ruleSetId") REFERENCES "ReviewRuleSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIRequest" ADD CONSTRAINT "AIRequest_lessonPlanId_fkey" FOREIGN KEY ("lessonPlanId") REFERENCES "LessonPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIRequest" ADD CONSTRAINT "AIRequest_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "LessonPlanSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIRequest" ADD CONSTRAINT "AIRequest_ruleSetId_fkey" FOREIGN KEY ("ruleSetId") REFERENCES "ReviewRuleSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIResponse" ADD CONSTRAINT "AIResponse_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "AIRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewResult" ADD CONSTRAINT "ReviewResult_lessonPlanId_fkey" FOREIGN KEY ("lessonPlanId") REFERENCES "LessonPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewResult" ADD CONSTRAINT "ReviewResult_ruleSetId_fkey" FOREIGN KEY ("ruleSetId") REFERENCES "ReviewRuleSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewResult" ADD CONSTRAINT "ReviewResult_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Annotation" ADD CONSTRAINT "Annotation_reviewResultId_fkey" FOREIGN KEY ("reviewResultId") REFERENCES "ReviewResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Annotation" ADD CONSTRAINT "Annotation_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "LessonPlanSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Annotation" ADD CONSTRAINT "Annotation_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "ReviewRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Annotation" ADD CONSTRAINT "Annotation_resolvedBy_fkey" FOREIGN KEY ("resolvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportHistory" ADD CONSTRAINT "ExportHistory_lessonPlanId_fkey" FOREIGN KEY ("lessonPlanId") REFERENCES "LessonPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportHistory" ADD CONSTRAINT "ExportHistory_reviewResultId_fkey" FOREIGN KEY ("reviewResultId") REFERENCES "ReviewResult"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportHistory" ADD CONSTRAINT "ExportHistory_exportedBy_fkey" FOREIGN KEY ("exportedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewHistory" ADD CONSTRAINT "ReviewHistory_lessonPlanId_fkey" FOREIGN KEY ("lessonPlanId") REFERENCES "LessonPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewHistory" ADD CONSTRAINT "ReviewHistory_performedBy_fkey" FOREIGN KEY ("performedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

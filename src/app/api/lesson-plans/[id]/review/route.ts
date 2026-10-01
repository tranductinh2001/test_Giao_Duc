import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { reviewSection, type SectionReviewResult, type KnowledgeContext, type ActivityContext } from "@/lib/beeknoee";
import { checkUserQuota, canUseModel, incrementUsageCount, logUsage } from "@/lib/usage-tracking";
import { type AIModelType } from "@/lib/ai-models";
import { rateLimit, getRateLimitIdentifier, RATE_LIMITS, applyRateLimitHeaders } from "@/lib/rate-limit";
import { validateModelName, isValidUUID, getClientIP, logSecurityEvent } from "@/lib/security";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/lesson-plans/[id]/review - Trigger AI review
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Chưa đăng nhập" },
        { status: 401 }
      );
    }

    // Apply rate limiting
    const rateLimitId = getRateLimitIdentifier(req, session.user.id);
    const rateLimitCheck = await rateLimit(RATE_LIMITS.AI_OPERATIONS)(req, rateLimitId);

    if (!rateLimitCheck.allowed && rateLimitCheck.response) {
      return rateLimitCheck.response;
    }

    const { id } = await context.params;

    // Validate lesson plan ID format
    if (!isValidUUID(id)) {
      const clientIP = getClientIP(req);
      await logSecurityEvent({
        userId: session.user.id,
        event: "invalid_uuid_attempt",
        details: { lessonPlanId: id, endpoint: "review" },
        ipAddress: clientIP,
        severity: "medium",
      });

      return NextResponse.json(
        { success: false, message: "ID không hợp lệ" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { model = "gemini-3.1-flash-lite" } = body; // Default to free Beeknoee model

    // Validate model name
    const modelValidation = validateModelName(model);
    if (!modelValidation.valid) {
      const clientIP = getClientIP(req);
      await logSecurityEvent({
        userId: session.user.id,
        event: "invalid_model_attempt",
        details: { model, lessonPlanId: id },
        ipAddress: clientIP,
        severity: "high",
      });

      return NextResponse.json(
        { success: false, message: modelValidation.error },
        { status: 400 }
      );
    }

    // Check user quota
    const quota = await checkUserQuota(session.user.id);
    if (!quota.canUse) {
      return NextResponse.json(
        {
          success: false,
          message: `Bạn đã hết quota cho tháng này (${quota.total} giáo án). Vui lòng nâng cấp gói dịch vụ.`,
          quota: {
            used: quota.total - quota.remaining,
            total: quota.total,
            remaining: quota.remaining,
          },
        },
        { status: 403 }
      );
    }

    // Check if user can use this model
    const modelCheck = await canUseModel(session.user.id, model as AIModelType);
    if (!modelCheck.canUse) {
      return NextResponse.json(
        { success: false, message: modelCheck.reason },
        { status: 403 }
      );
    }

    // Check ownership
    const lessonPlan = await prisma.lessonPlan.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        title: true,
        subject: true,
        gradeLevel: true,
        schoolYear: true,
        circularId: true,
        deletedAt: true,
        status: true,
        currentVersion: true,
      },
    });

    if (!lessonPlan) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy giáo án" },
        { status: 404 }
      );
    }

    if (lessonPlan.userId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Không có quyền truy cập" },
        { status: 403 }
      );
    }

    if (lessonPlan.deletedAt) {
      return NextResponse.json(
        { success: false, message: "Giáo án đã bị xóa" },
        { status: 404 }
      );
    }

    // Check if lesson plan is parsed
    if (lessonPlan.status !== "PARSED" && lessonPlan.status !== "REVIEWED") {
      return NextResponse.json(
        {
          success: false,
          message: "Giáo án chưa được parse. Vui lòng parse trước khi review.",
        },
        { status: 400 }
      );
    }

    // Check if already reviewing
    if (lessonPlan.status === "REVIEWING" as any) {
      return NextResponse.json(
        { success: false, message: "Đang trong quá trình review" },
        { status: 409 }
      );
    }

    // Get all sections
    const sections = await prisma.lessonPlanSection.findMany({
      where: {
        lessonPlanId: id,
        versionNumber: lessonPlan.currentVersion,
      },
      orderBy: { sectionOrder: "asc" },
    });

    if (sections.length === 0) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy sections để review" },
        { status: 404 }
      );
    }

    // Load SectionRules for review criteria
    const sectionRules = await prisma.sectionRule.findMany({
      where: { isActive: true },
      orderBy: [{ sectionType: "asc" }, { priority: "desc" }],
    });

    // Get all active teaching methods
    const teachingMethods = await prisma.teachingMethod.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        objectives: true,
        process: true,
        advantages: true,
        limitations: true,
      },
    });

    // =====================================================
    // BUILD KNOWLEDGE CONTEXT - Single source of truth
    // =====================================================
    const knowledgeContext: KnowledgeContext = {
      lessonPlan: {
        id: lessonPlan.id,
        title: lessonPlan.title,
        subject: lessonPlan.subject,
        gradeLevel: lessonPlan.gradeLevel,
        schoolYear: lessonPlan.schoolYear,
      },
      circular: null, // Will be populated if circularId exists
      rules: sectionRules,
      teachingMethods: teachingMethods,
      textbook: null,
    };

    // Get circular if linked
    if (lessonPlan.circularId) {
      const circular = await prisma.circularDocument.findUnique({
        where: { id: lessonPlan.circularId },
        select: { id: true, code: true, title: true, type: true },
      });
      if (circular) {
        knowledgeContext.circular = {
          id: circular.id,
          code: circular.code,
          title: circular.title,
          type: circular.type,
        };
      }
    }

    // Update status to REVIEWING
    await prisma.lessonPlan.update({
      where: { id },
      data: { status: "REVIEWING" },
    });

    // Log action - will be completed after review
    await prisma.reviewHistory.create({
      data: {
        lessonPlanId: id,
        actionType: "REVIEWED",
        actionData: {
          startedAt: new Date().toISOString(),
          aiModel: model,
          status: "STARTED",
        },
        performedBy: session.user.id,
      },
    });

    try {
      // Create review result record first
      const reviewResultRecord = await prisma.reviewResult.create({
        data: {
          lessonPlanId: id,
          overallScore: 0, // Will update later
          status: "DRAFT",
          totalIssues: 0,
          criticalIssues: 0,
          errorIssues: 0,
          warningIssues: 0,
          infoIssues: 0,
          reviewedBy: session.user.id,
          metadata: sectionRules.length > 0 ? {
            sectionRulesCount: sectionRules.length,
          } : undefined,
        },
      });

      // Review each section with combined teaching methods analysis (single AI call)
      const allFindings: any[] = [];
      let totalScore = 0;
      let sectionCount = 0;
      let totalInputTokens = 0;
      let totalOutputTokens = 0;

      // Track teaching method analysis from activity sections
      const activityTeachingMethods: Array<{
        sectionId: string;
        sectionTitle: string;
        analysis: NonNullable<SectionReviewResult["teachingMethodAnalysis"]>;
      }> = [];

      for (const section of sections) {
        const sectionReqs = knowledgeContext.rules.filter(r => r.sectionType === section.sectionType);

        if (sectionReqs.length === 0) {
          continue;
        }

        // Determine if this is an activity section
        const isActivitySection =
          section.sectionType === "HOAT_DONG" ||
          section.sectionType === "ACTIVITIES" ||
          section.sectionType.toLowerCase().includes("hoat_dong") ||
          section.sectionType.toLowerCase().includes("activity");

        // Build Activity Context for this section
        const activityContext: ActivityContext = {
          section: {
            id: section.id,
            sectionType: section.sectionType,
            sectionTitle: section.sectionTitle || `Section ${section.sectionOrder}`,
            sectionOrder: section.sectionOrder,
            rawContent: section.rawContent,
          },
          isActivitySection,
        };

        // Review section with Beeknoee using Knowledge Context pattern
        const reviewResult = await reviewSection(activityContext, knowledgeContext, model);

        // Estimate tokens (approximation)
        const inputTokens = Math.ceil(section.rawContent.length / 3) + 500;
        const outputTokens = Math.ceil(JSON.stringify(reviewResult).length / 3);
        totalInputTokens += inputTokens;
        totalOutputTokens += outputTokens;

        // Create annotations from findings
        for (const finding of reviewResult.findings) {
          const matchedSectionRule = sectionReqs.find(sr => sr.title === finding.ruleCode || sr.id === finding.ruleCode);

          const annotation = await prisma.annotation.create({
            data: {
              reviewResultId: reviewResultRecord.id,
              sectionId: section.id,
              ruleId: matchedSectionRule?.id || null,
              annotationType: "SUGGESTION",
              severity: finding.severity,
              startPosition: finding.position.startChar,
              endPosition: finding.position.endChar,
              highlightedText: finding.highlightedText,
              message: finding.issue,
              explanation: finding.explanation,
              suggestion: finding.suggestion,
              proposedContent: finding.proposedContent,
              status: "PENDING",
            },
          });

          allFindings.push({
            annotationId: annotation.id,
            sectionId: section.id,
            sectionTitle: section.sectionTitle,
            ...finding,
          });
        }

        // Collect teaching method analysis from activity sections
        if (isActivitySection && reviewResult.teachingMethodAnalysis) {
          activityTeachingMethods.push({
            sectionId: section.id,
            sectionTitle: section.sectionTitle || `Section ${section.sectionOrder}`,
            analysis: reviewResult.teachingMethodAnalysis,
          });
        }

        totalScore += reviewResult.overallScore;
        sectionCount++;
      }

      // Calculate overall score
      const overallScore = sectionCount > 0 ? totalScore / sectionCount : 0;

      // ==== AGGREGATE TEACHING METHODS ANALYSIS ====
      // Build teaching method analysis from activity sections
      let teachingMethodAnalysis = null;
      let teachingMethodScore = null;

      if (activityTeachingMethods.length > 0) {
        // Calculate average pedagogy score
        const totalPedagogyScore = activityTeachingMethods.reduce(
          (sum, tm) => sum + tm.analysis.pedagogyScore,
          0
        );
        teachingMethodScore = totalPedagogyScore / activityTeachingMethods.length;

        // Build aggregated analysis - use the highest scoring one as primary
        const sortedByScore = [...activityTeachingMethods].sort(
          (a, b) => b.analysis.pedagogyScore - a.analysis.pedagogyScore
        );
        const primaryAnalysis = sortedByScore[0].analysis;

        teachingMethodAnalysis = {
          currentMethod: primaryAnalysis.currentMethod,
          recommendedMethods: primaryAnalysis.recommendedMethods,
          alternativeMethods: primaryAnalysis.alternativeMethods,
          pedagogyScore: teachingMethodScore,
          overallRecommendation: primaryAnalysis.overallRecommendation,
          // Include per-section analysis for detailed view
          perSectionAnalysis: activityTeachingMethods.map(tm => ({
            sectionId: tm.sectionId,
            sectionTitle: tm.sectionTitle,
            currentMethod: tm.analysis.currentMethod,
            pedagogyScore: tm.analysis.pedagogyScore,
            recommendedMethods: tm.analysis.recommendedMethods,
          })),
        };
      }

      // Count issues by severity
      const criticalCount = allFindings.filter((f) => f.severity === "CRITICAL").length;
      const errorCount = allFindings.filter((f) => f.severity === "ERROR").length;
      const warningCount = allFindings.filter((f) => f.severity === "WARNING").length;
      const infoCount = allFindings.filter((f) => f.severity === "INFO").length;

      // Update review result with final data
      const reviewResult = await prisma.reviewResult.update({
        where: { id: reviewResultRecord.id },
        data: {
          overallScore,
          status: "COMPLETED",
          totalIssues: allFindings.length,
          criticalIssues: criticalCount,
          errorIssues: errorCount,
          warningIssues: warningCount,
          infoIssues: infoCount,
          teachingMethodAnalysis: teachingMethodAnalysis as any || undefined,
          teachingMethodScore: teachingMethodScore ? Number(teachingMethodScore) : undefined,
          reviewedAt: new Date(),
        },
      });

      // Update review history with completed data including teaching method analysis
      await prisma.reviewHistory.create({
        data: {
          lessonPlanId: id,
          reviewResultId: reviewResult.id,
          actionType: "REVIEWED",
          actionData: {
            completedAt: new Date().toISOString(),
            score: overallScore,
            issues: allFindings.length,
            criticalIssues: criticalCount,
            errorIssues: errorCount,
            warningIssues: warningCount,
            infoIssues: infoCount,
            teachingMethodAnalysis: teachingMethodAnalysis as any,
            teachingMethodScore,
            aiModel: model,
          },
          performedBy: session.user.id,
        },
      });

      // Calculate cost and log usage
      const { calculateEstimatedCost } = await import("@/lib/ai-models");
      const totalCost = calculateEstimatedCost(totalInputTokens, totalOutputTokens, model as AIModelType);

      // Increment usage count
      await incrementUsageCount(session.user.id);

      // Log usage
      await logUsage({
        userId: session.user.id,
        lessonPlanId: id,
        operationType: "review",
        modelUsed: model as AIModelType,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        totalCost,
        success: true,
      });

      // Update lesson plan status to REVIEWED
      await prisma.lessonPlan.update({
        where: { id },
        data: { status: "REVIEWED" },
      });

      const response = NextResponse.json({
        success: true,
        message: "Review hoàn tất",
        data: {
          reviewResultId: reviewResult.id,
          lessonPlanId: id,
          status: "REVIEWED",
          overallScore,
          totalIssues: allFindings.length,
          criticalIssues: criticalCount,
          errorIssues: errorCount,
          warningIssues: warningCount,
          infoIssues: infoCount,
          sectionsReviewed: sectionCount,
          teachingMethodAnalysis,
          teachingMethodScore,
        },
      });

      // Apply rate limit headers
      return applyRateLimitHeaders(response, rateLimitCheck, RATE_LIMITS.AI_OPERATIONS);
    } catch (reviewError) {
      // Update status to FAILED
      await prisma.lessonPlan.update({
        where: { id },
        data: { status: "PARSED" }, // Revert to PARSED so user can retry
      });

      const errorMessage =
        reviewError instanceof Error ? reviewError.message : "Unknown error";

      // Log failed usage
      await logUsage({
        userId: session.user.id,
        lessonPlanId: id,
        operationType: "review",
        modelUsed: model as AIModelType,
        inputTokens: 0,
        outputTokens: 0,
        totalCost: 0,
        success: false,
        errorMessage,
      });

      return NextResponse.json(
        {
          success: false,
          message: `Lỗi khi review giáo án: ${errorMessage}`,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error reviewing lesson plan:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi review giáo án" },
      { status: 500 }
    );
  }
}

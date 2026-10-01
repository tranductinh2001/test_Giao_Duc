/**
 * Get Workflow Annotations API
 *
 * Phase 7.1: Production-ready DocumentEditor
 * Returns annotations for a workflow session from database
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, message: "sessionId is required" },
        { status: 400 }
      );
    }

    // Find the lesson plan by session ID or use sessionId as lessonPlanId
    // The sessionId in our context is the lessonPlanId
    const lessonPlanId = sessionId;

    // Fetch annotations from database via ReviewResult
    const reviewResult = await prisma.reviewResult.findFirst({
      where: { lessonPlanId },
      orderBy: { createdAt: "desc" },
      include: {
        annotations: {
          include: {
            rule: true,
            section: true,
          },
        },
      },
    });

    // If no review result found, return empty
    if (!reviewResult || reviewResult.annotations.length === 0) {
      return NextResponse.json({
        success: true,
        sessionId,
        annotations: [],
        statistics: {
          totalAnnotations: 0,
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          passed: 0,
        },
        groups: [],
      });
    }

    // Map database annotations to EditorAnnotation format
    const annotations = reviewResult.annotations.map((annotation) => ({
      annotationId: annotation.id,
      activityId: annotation.sectionId,
      activityCode: annotation.section?.sectionType || "",
      activityTitle: annotation.section?.sectionTitle || "",
      sectionId: annotation.sectionId,
      sectionName: annotation.section?.sectionTitle || "",
      paragraphIndex: annotation.startPosition,
      anchor: annotation.startPosition !== undefined && annotation.endPosition !== undefined
        ? {
            paragraphId: annotation.sectionId,
            paragraphIndex: annotation.startPosition,
            startOffset: annotation.startPosition,
            endOffset: annotation.endPosition,
            textHash: annotation.highlightedText || "",
          }
        : undefined,
      severity: mapSeverity(annotation.severity),
      ruleId: annotation.ruleId || "",
      ruleName: annotation.rule?.ruleName || "",
      title: annotation.message,
      description: annotation.explanation || "",
      reason: annotation.explanation || "",
      suggestions: annotation.suggestion ? [annotation.suggestion] : [],
      confidence: 80, // Default confidence for stored annotations
      status: mapAnnotationStatus(annotation.status),
      createdAt: annotation.createdAt,
      updatedAt: annotation.resolvedAt || annotation.createdAt,
    }));

    // Calculate statistics
    const statistics = {
      totalAnnotations: annotations.length,
      critical: annotations.filter((a) => a.severity === "CRITICAL").length,
      high: annotations.filter((a) => a.severity === "HIGH").length,
      medium: annotations.filter((a) => a.severity === "MEDIUM").length,
      low: annotations.filter((a) => a.severity === "LOW").length,
      passed: annotations.filter((a) => a.severity === "PASSED").length,
    };

    // Group by section
    const groupsMap = new Map<string, typeof annotations>();
    for (const annotation of annotations) {
      const key = annotation.sectionId;
      if (!groupsMap.has(key)) {
        groupsMap.set(key, []);
      }
      groupsMap.get(key)!.push(annotation);
    }

    const groups = Array.from(groupsMap.entries()).map(([key, groupAnnotations]) => ({
      key,
      label: groupAnnotations[0].sectionName,
      type: "section" as const,
      annotations: groupAnnotations,
      count: groupAnnotations.length,
    }));

    return NextResponse.json({
      success: true,
      sessionId,
      annotations,
      statistics,
      groups,
    });
  } catch (error: any) {
    console.error("Error getting annotations:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper functions to map enums
function mapSeverity(severity: string): "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "PASSED" {
  switch (severity) {
    case "CRITICAL":
      return "CRITICAL";
    case "HIGH":
      return "HIGH";
    case "MEDIUM":
      return "MEDIUM";
    case "LOW":
      return "LOW";
    case "INFO":
      return "LOW";
    case "PASSED":
      return "PASSED";
    default:
      return "MEDIUM";
  }
}

function mapAnnotationStatus(status: string): "OPEN" | "REVIEWED" | "DISMISSED" | "FIXED" {
  switch (status) {
    case "PENDING":
      return "OPEN";
    case "RESOLVED":
      return "FIXED";
    case "ACCEPTED":
      return "REVIEWED";
    case "REJECTED":
      return "DISMISSED";
    default:
      return "OPEN";
  }
}

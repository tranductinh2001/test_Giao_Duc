import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface ReviewActionData {
  completedAt?: string;
  score?: number | null;
  issues?: number;
  workflowSessionId?: string;
  circularId?: string | null;
  circularCode?: string | null;
  circularVersion?: number | null;
  templateId?: string | null;
  templateCode?: string | null;
  templateVersion?: number | null;
  aiModel?: string | null;
  executionTime?: number;
  teachingMethodAnalysis?: {
    currentMethod: { name: string; description: string; confidence: number };
    recommendedMethods: Array<{ name: string; reason: string; suitabilityScore: number }>;
    pedagogyScore: number;
    overallRecommendation: string;
    perSectionAnalysis?: Array<{
      sectionId: string;
      sectionTitle: string;
      currentMethod: { name: string };
      pedagogyScore: number;
    }>;
  };
  teachingMethodScore?: number | null;
  criticalIssues?: number;
  errorIssues?: number;
  warningIssues?: number;
  infoIssues?: number;
}

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const lessonPlanId = searchParams.get("lessonPlanId");

    // Get review history with version tracking
    const history = await prisma.reviewHistory.findMany({
      where: lessonPlanId ? { lessonPlanId } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        lessonPlan: {
          select: {
            id: true,
            title: true,
          },
        },
        performer: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // Transform to include all version info from actionData
    const transformed = history.map((h) => {
      const actionData = h.actionData as ReviewActionData | null;
      return {
        id: h.id,
        lessonPlanId: h.lessonPlanId,
        lessonPlanTitle: h.lessonPlan?.title,
        actionType: h.actionType,
        score: actionData?.score ?? null,
        issues: actionData?.issues ?? 0,
        aiModel: actionData?.aiModel ?? null,
        circularCode: actionData?.circularCode ?? null,
        circularVersion: actionData?.circularVersion ?? null,
        templateCode: actionData?.templateCode ?? null,
        templateVersion: actionData?.templateVersion ?? null,
        executionTime: actionData?.executionTime ?? null,
        teachingMethodScore: actionData?.teachingMethodScore ?? null,
        teachingMethodAnalysis: actionData?.teachingMethodAnalysis ?? null,
        createdAt: h.createdAt.toISOString(),
        performer: {
          name: h.performer?.name,
          email: h.performer?.email,
        },
      };
    });

    return NextResponse.json({ success: true, data: transformed });
  } catch (error) {
    console.error("Error fetching review history:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

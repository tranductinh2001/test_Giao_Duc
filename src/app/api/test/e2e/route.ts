/**
 * Test E2E Workflow - No Auth
 * POST /api/test/e2e
 */
import { NextRequest, NextResponse } from "next/server";
import { startWorkflow } from "@/lib/workflow-service";
// import { v4 as uuidv4 } from "uuid";

const TEST_USER_ID = "343585e5-befa-4525-b251-fb9d88e51fc3";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { lessonPlanId, templateId } = body;

    if (!lessonPlanId) {
      return NextResponse.json(
        { success: false, message: "lessonPlanId is required" },
        { status: 400 }
      );
    }

    console.log(`[E2E Test] Starting workflow for lesson plan: ${lessonPlanId}`);

    const sessionId = await startWorkflow({
      lessonPlanId,
      userId: TEST_USER_ID,
      templateId: templateId || undefined,
    });

    return NextResponse.json({
      success: true,
      sessionId,
      message: "Workflow started",
    });
  } catch (error: any) {
    console.error("[E2E Test] Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}

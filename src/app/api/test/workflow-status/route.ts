/**
 * Workflow Status API
 * GET /api/test/workflow-status?sessionId=xxx
 */
import { NextRequest, NextResponse } from "next/server";
import { getWorkflowProgress } from "@/lib/workflow-service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { success: false, message: "sessionId is required" },
        { status: 400 }
      );
    }

    const progress = await getWorkflowProgress(sessionId);

    if (!progress) {
      return NextResponse.json(
        { success: false, message: "Session not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(progress);

  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}

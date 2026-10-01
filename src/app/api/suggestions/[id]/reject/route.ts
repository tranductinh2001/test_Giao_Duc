/**
 * POST /api/suggestions/{id}/reject
 *
 * Reject a suggestion
 */

import { NextRequest, NextResponse } from "next/server";
import { SuggestionService } from "@/core/ai-suggestion-engine/services/SuggestionService";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: suggestionId } = await params;

    const service = new SuggestionService();
    const result = await service.rejectSuggestion(suggestionId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.error || "Failed to reject suggestion" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Suggestion rejected",
    });
  } catch (error) {
    console.error("Error rejecting suggestion:", error);
    return NextResponse.json(
      { success: false, message: "Failed to reject suggestion" },
      { status: 500 }
    );
  }
}

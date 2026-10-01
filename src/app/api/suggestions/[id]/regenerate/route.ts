/**
 * POST /api/suggestions/{id}/regenerate
 *
 * Regenerate a suggestion with new AI fix
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
    const result = await service.regenerateSuggestion(suggestionId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.error || "Failed to regenerate suggestion" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Suggestion regenerated",
      newSuggestion: result.newSuggestion,
    });
  } catch (error) {
    console.error("Error regenerating suggestion:", error);
    return NextResponse.json(
      { success: false, message: "Failed to regenerate suggestion" },
      { status: 500 }
    );
  }
}

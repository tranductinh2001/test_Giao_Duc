/**
 * POST /api/suggestions/{id}/accept
 *
 * Accept a suggestion and apply the patch
 */

import { NextRequest, NextResponse } from "next/server";
import { SuggestionService } from "@/core/ai-suggestion-engine/services/SuggestionService";
import { PatchService } from "@/core/ai-suggestion-engine/services/PatchService";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: suggestionId } = await params;
    const body = await request.json();

    const suggestionService = new SuggestionService();
    const patchService = new PatchService();

    // Accept the suggestion
    const result = await suggestionService.acceptSuggestion(suggestionId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.error || "Failed to accept suggestion" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Suggestion accepted",
      patch: result.patch,
    });
  } catch (error) {
    console.error("Error accepting suggestion:", error);
    return NextResponse.json(
      { success: false, message: "Failed to accept suggestion" },
      { status: 500 }
    );
  }
}

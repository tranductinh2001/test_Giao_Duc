/**
 * GET /api/review/{sessionId}/suggestions
 *
 * Get all suggestions for a review session
 */

import { NextRequest, NextResponse } from "next/server";
import { SuggestionService } from "@/core/ai-suggestion-engine/services/SuggestionService";
import { SuggestionGroupBy, SuggestionGroup, Suggestion } from "@/core/ai-suggestion-engine/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const searchParams = request.nextUrl.searchParams;

    const groupBy = searchParams.get("groupBy") as SuggestionGroupBy | null;
    const status = searchParams.get("status") as any | null;
    const minConfidence = searchParams.get("minConfidence")
      ? parseFloat(searchParams.get("minConfidence")!)
      : undefined;

    const service = new SuggestionService();
    const suggestions = await service.getSuggestions({
      sessionId,
      groupBy: groupBy || undefined,
      status: status || undefined,
      minConfidence,
    });

    // Group if requested
    const response: {
      success: boolean;
      sessionId: string;
      suggestions: Suggestion[];
      groups?: SuggestionGroup[];
      statistics: ReturnType<typeof service.calculateStatistics>;
    } = {
      success: true,
      sessionId,
      suggestions,
      statistics: service.calculateStatistics(suggestions),
    };

    if (groupBy && suggestions.length > 0) {
      response.groups = service.groupSuggestions(suggestions, groupBy);
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error getting suggestions:", error);
    return NextResponse.json(
      { success: false, message: "Failed to get suggestions" },
      { status: 500 }
    );
  }
}

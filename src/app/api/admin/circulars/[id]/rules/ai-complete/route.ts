import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAIRuleGenerator } from "@/lib/services/AIRuleGenerator";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/admin/circulars/[id]/rules/ai-complete - Complete missing fields using AI
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Không có quyền truy cập" }, { status: 403 });
    }

    const { id } = await context.params;

    // Parse request body
    const body = await req.json();
    const { rule } = body;

    if (!rule || !rule.tenTieuChi || !rule.nhomTieuChi) {
      return NextResponse.json({ success: false, message: "Thiếu thông tin tiêu chí" }, { status: 400 });
    }

    // Get AI generator
    const generator = getAIRuleGenerator();

    if (!generator.isConfigured()) {
      return NextResponse.json({ success: false, message: "AI chưa được cấu hình" }, { status: 503 });
    }

    // Complete the rule
    const completedRule = await generator.completeRule(rule);

    return NextResponse.json({
      success: true,
      message: "Đã hoàn thiện tiêu chí",
      data: {
        rule: completedRule,
      },
    });
  } catch (error) {
    console.error("Error completing rule with AI:", error);
    return NextResponse.json({ success: false, message: "Lỗi khi hoàn thiện bằng AI" }, { status: 500 });
  }
}

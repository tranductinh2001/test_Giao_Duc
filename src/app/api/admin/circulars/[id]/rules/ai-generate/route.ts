import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getAIRuleGenerator, GenerateRulesRequest } from "@/lib/services/AIRuleGenerator";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/admin/circulars/[id]/rules/ai-generate - Generate rules using AI
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Không có quyền truy cập" }, { status: 403 });
    }

    const { id } = await context.params;

    // Check if circular exists
    const circular = await prisma.circularDocument.findUnique({
      where: { id },
      select: { id: true, code: true, title: true, isActive: true },
    });

    if (!circular) {
      return NextResponse.json({ success: false, message: "Không tìm thấy Công văn" }, { status: 404 });
    }

    if (!circular.isActive) {
      return NextResponse.json({ success: false, message: "Công văn đã bị vô hiệu hóa" }, { status: 400 });
    }

    // Parse request body
    const body = await req.json();
    const { count, detailLevel, language, model } = body;

    // Validate
    if (!count || count < 1 || count > 100) {
      return NextResponse.json({ success: false, message: "Số lượng rules phải từ 1-100" }, { status: 400 });
    }

    // Get AI generator with selected model
    const generator = getAIRuleGenerator(model);

    if (!generator.isConfigured()) {
      return NextResponse.json({ success: false, message: "AI chưa được cấu hình" }, { status: 503 });
    }

    // Generate rules
    const generateRequest: GenerateRulesRequest = {
      circularCode: circular.code,
      circularTitle: circular.title,
      count: Math.min(count, 50), // Max 50 at a time
      detailLevel: detailLevel || "medium",
      language: language || "vi",
    };

    const result = await generator.generateRules(generateRequest);

    if (!result.success) {
      return NextResponse.json({ success: false, message: result.error || "Lỗi khi sinh rules" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Đã sinh ${result.rules.length} rules mẫu`,
      data: {
        rules: result.rules,
      },
    });
  } catch (error) {
    console.error("Error generating rules with AI:", error);
    return NextResponse.json({ success: false, message: "Lỗi khi sinh rules bằng AI" }, { status: 500 });
  }
}

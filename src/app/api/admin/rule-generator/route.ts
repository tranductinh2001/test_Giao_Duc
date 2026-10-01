import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { RuleGeneratorService } from "@/lib/services/rule-generator/RuleGeneratorService";
import { BeekOneAIClient } from "@/lib/beekone-ai-client";
import { getActiveModels, getModelById, getDefaultModel } from "@/lib/ai-models";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/rule-generator
 * Get available documents, models, and generation status
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Chỉ Admin mới có quyền truy cập" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    // Check AI availability
    const aiClient = new BeekOneAIClient();
    const aiAvailable = aiClient.isAvailable();

    if (action === "documents") {
      // Get list of available documents
      const documents = RuleGeneratorService.getAvailableDocuments();

      // Check cache status for each document
      const documentsWithCache = await Promise.all(
        documents.map(async (doc) => {
          try {
            const cache = await prisma.systemConfig.findUnique({
              where: { key: `rule_generator_${doc.code}` },
            });
            return {
              ...doc,
              hasCache: !!cache,
              cachedAt: cache?.updatedAt?.toISOString(),
            };
          } catch {
            return { ...doc, hasCache: false };
          }
        })
      );

      // Also get circulars from database
      const circulars = await prisma.circularDocument.findMany({
        where: { isActive: true },
        select: { id: true, code: true, title: true, type: true },
        orderBy: { code: "asc" },
      });

      // Get available models from single source of truth
      const models = getActiveModels().map(m => ({
        id: m.id,
        displayName: m.displayName,
        provider: m.provider,
        inputPrice: m.inputPrice,
        outputPrice: m.outputPrice,
        unit: m.unit,
      }));

      return NextResponse.json({
        success: true,
        data: {
          predefined: documentsWithCache,
          circulars: circulars,
          models,
          aiAvailable,
        },
      });
    }

    if (action === "status") {
      return NextResponse.json({
        success: true,
        data: {
          aiAvailable,
          models: getActiveModels().map(m => m.id),
        },
      });
    }

    // Default: return documents list
    const documents = RuleGeneratorService.getAvailableDocuments();
    return NextResponse.json({
      success: true,
      data: { documents, aiAvailable },
    });
  } catch (error) {
    console.error("Error getting rule generator data:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi lấy dữ liệu" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/rule-generator
 * Generate rules from document
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Chỉ Admin mới có quyền truy cập" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { documentCode, documentId, model, forceRegenerate = false } = body;

    if (!documentCode && !documentId) {
      return NextResponse.json(
        { success: false, message: "Thiếu documentCode hoặc documentId" },
        { status: 400 }
      );
    }

    // Validate model using single source of truth
    const modelId = model ? (getModelById(model)?.id || getDefaultModel().id) : getDefaultModel().id;

    // If documentId provided, get the document first
    let finalDocumentCode = documentCode;
    if (documentId) {
      const circular = await prisma.circularDocument.findUnique({
        where: { id: documentId },
      });
      if (circular) {
        finalDocumentCode = circular.code;
      }
    }

    // Check AI availability
    const aiClient = new BeekOneAIClient();
    if (!aiClient.isAvailable()) {
      // Try to use cached data
      const cached = await RuleGeneratorService.checkCache(finalDocumentCode);
      if (cached) {
        return NextResponse.json({
          success: true,
          data: {
            documentCode: finalDocumentCode,
            ruleCount: cached.ruleCount,
            excelBuffer: cached.excelBuffer.toString("base64"),
            cachedAt: cached.createdAt,
            usedCache: true,
          },
          warning: "AI không khả dụng. Đã sử dụng dữ liệu cache.",
        });
      }
      return NextResponse.json(
        { success: false, message: "AI không khả dụng và không có cache. Vui lòng cấu hình API key." },
        { status: 503 }
      );
    }

    // Generate rules with model selection
    const result = await RuleGeneratorService.generateFromDocument(
      finalDocumentCode,
      session.user.id,
      {
        model: modelId,
        forceRegenerate,
      }
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.error || "Lỗi khi tạo rules" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        documentCode: result.documentCode,
        ruleCount: result.ruleCount,
        rules: result.rules || [],
        excelBuffer: result.excelBuffer?.toString("base64"),
        cachedAt: result.cachedAt,
        usedCache: !!result.cachedAt,
        model: modelId,
      },
    });
  } catch (error) {
    console.error("Error generating rules:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi tạo rules" },
      { status: 500 }
    );
  }
}

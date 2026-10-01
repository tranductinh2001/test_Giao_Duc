import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ExcelService } from "@/lib/services/ExcelService";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/admin/circulars/[id]/rules/excel - Download Excel template
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Không có quyền truy cập" }, { status: 403 });
    }

    const { id } = await context.params;
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action"); // 'template' | 'export'

    // Get circular
    const circular = await prisma.circularDocument.findUnique({
      where: { id },
      select: { id: true, code: true, title: true },
    });

    if (!circular) {
      return NextResponse.json({ success: false, message: "Không tìm thấy Công văn" }, { status: 404 });
    }

    // Get existing rules for this circular
    const existingRules = await prisma.sectionRule.findMany({
      where: { circularId: id },
      orderBy: [{ level: "asc" }, { order: "asc" }],
    });

    let buffer: Buffer;

    if (action === "export" || (action === null && existingRules.length > 0)) {
      // Export existing rules
      buffer = ExcelService.exportRules(circular.code, existingRules);
    } else {
      // Generate empty template
      buffer = ExcelService.generateTemplate(circular.code);
    }

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="rules-${circular.code}-${new Date().toISOString().split("T")[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Error generating Excel:", error);
    return NextResponse.json({ success: false, message: "Lỗi khi tạo file Excel" }, { status: 500 });
  }
}

// POST /api/admin/circulars/[id]/rules/excel - Preview Excel import
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

    // Get existing rules for this circular
    const existingRules = await prisma.sectionRule.findMany({
      where: { circularId: id },
    });

    // Parse form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, message: "Không có file" }, { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse and validate Excel
    const result = ExcelService.parseAndValidateExcel(buffer, existingRules);

    // Map each row to its matched existing rule
    const preview = result.preview.map((row) => {
      const matchedRule = ExcelService.matchExistingRule(row, existingRules);
      return {
        ...row,
        existingRuleId: matchedRule?.id || null,
        isUpdate: !!matchedRule,
      };
    });

    return NextResponse.json({
      success: result.success,
      message: result.success
        ? `Preview: ${result.newCount} rules mới, ${result.updateCount} rules cập nhật`
        : `Có ${result.errorCount} lỗi cần sửa`,
      data: {
        newCount: result.newCount,
        updateCount: result.updateCount,
        errorCount: result.errorCount,
        errors: result.errors,
        preview,
      },
    });
  } catch (error) {
    console.error("Error previewing Excel import:", error);
    return NextResponse.json({ success: false, message: "Lỗi khi đọc file Excel" }, { status: 500 });
  }
}

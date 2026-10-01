import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ExcelService } from "@/lib/services/ExcelService";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/admin/circulars/[id]/rules/excel/confirm - Confirm and save imported rules
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Không có quyền truy cập" }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await req.json();
    const { rules } = body;

    if (!Array.isArray(rules) || rules.length === 0) {
      return NextResponse.json({ success: false, message: "Không có rules để lưu" }, { status: 400 });
    }

    // Check if circular exists
    const circular = await prisma.circularDocument.findUnique({
      where: { id },
      select: { id: true, code: true, isActive: true },
    });

    if (!circular) {
      return NextResponse.json({ success: false, message: "Không tìm thấy Công văn" }, { status: 404 });
    }

    if (!circular.isActive) {
      return NextResponse.json({ success: false, message: "Công văn đã bị vô hiệu hóa" }, { status: 400 });
    }

    // Get existing rules for this circular to match
    const existingRules = await prisma.sectionRule.findMany({
      where: { circularId: id },
      select: { id: true, title: true, sectionType: true, order: true },
    });

    // Process in batches to avoid transaction timeout
    // For each rule, do individual create/update
    let newCount = 0;
    let updateCount = 0;

    // Build lookup maps for parent matching
    const titleToIdMap = new Map(existingRules.map(r => [r.title.toLowerCase(), r.id]));

    for (const rule of rules) {
      try {
        // Match existing rule by title + sectionType
        const matchedRule = ExcelService.matchExistingRule(rule, existingRules);

        // Find parent ID if specified
        let parentId = null;
        if (rule.tieuChiCha) {
          parentId = titleToIdMap.get(rule.tieuChiCha.toLowerCase()) || null;
        }

        if (matchedRule) {
          // Update existing rule
          await prisma.sectionRule.update({
            where: { id: matchedRule.id },
            data: {
              title: rule.tenTieuChi,
              requirements: rule.noiDungDanhGia,
              correctExample: rule.viDuDung || '',
              incorrectExample: rule.viDuSai || '',
              aiPrompt: rule.promptAI || '',
              priority: rule.diem || 0,
              weight: rule.trongSo || 1.0,
              level: rule.capDo || 3,
              parentId,
              isActive: rule.batBuoc,
              order: rule.stt || 0,
            },
          });
          updateCount++;
        } else {
          // Create new rule
          await prisma.sectionRule.create({
            data: {
              circularId: id,
              sectionType: rule.nhomTieuChi,
              title: rule.tenTieuChi,
              requirements: rule.noiDungDanhGia,
              correctExample: rule.viDuDung || '',
              incorrectExample: rule.viDuSai || '',
              aiPrompt: rule.promptAI || '',
              priority: rule.diem || 0,
              weight: rule.trongSo || 1.0,
              level: rule.capDo || 3,
              parentId,
              isActive: rule.batBuoc,
              order: rule.stt || 0,
              createdBy: session.user.id,
            },
          });
          newCount++;
        }
      } catch (err) {
        console.error("Error saving rule:", rule.tenTieuChi, err);
        // Continue with other rules
      }
    }

    const results = { newCount, updateCount };

    return NextResponse.json({
      success: true,
      message: `Import thành công: ${results.newCount} rules mới, ${results.updateCount} rules cập nhật`,
      data: results,
    });
  } catch (error) {
    console.error("Error confirming Excel import:", error);
    return NextResponse.json({ success: false, message: "Lỗi khi lưu rules" }, { status: 500 });
  }
}

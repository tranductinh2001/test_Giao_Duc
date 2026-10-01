import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/section-rules - List all section rules
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Không có quyền truy cập" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const sectionType = searchParams.get("sectionType");
    const activeOnly = searchParams.get("activeOnly") === "true";
    const circularId = searchParams.get("circularId");
    const includeGlobal = searchParams.get("includeGlobal") !== "false"; // Default true
    const hierarchy = searchParams.get("hierarchy") === "true";

    const where: any = {};
    if (sectionType) where.sectionType = sectionType;
    if (activeOnly) where.isActive = true;

    // Filter by circularId
    if (circularId === "global") {
      where.circularId = null;
    } else if (circularId) {
      // Specific circular - optionally include global rules too
      if (includeGlobal) {
        where.OR = [
          { circularId: circularId },
          { circularId: null },
        ];
      } else {
        where.circularId = circularId;
      }
    }

    const rules = await prisma.sectionRule.findMany({
      where,
      include: {
        creator: { select: { id: true, name: true, email: true } },
        circular: { select: { id: true, code: true, title: true } },
        parent: { select: { id: true, title: true } },
      },
      orderBy: [
        { circularId: "desc" }, // Circular-specific rules first
        { level: "asc" },
        { order: "asc" },
        { priority: "desc" },
        { title: "asc" },
      ],
    });

    // Build hierarchical structure if requested
    if (hierarchy) {
      const rulesById = new Map(rules.map(r => [r.id, { ...r, children: [] as typeof rules }]));
      const rootRules: typeof rules = [];

      rules.forEach(rule => {
        const ruleWithChildren = rulesById.get(rule.id)!;
        if (rule.parentId && rulesById.has(rule.parentId)) {
          rulesById.get(rule.parentId)!.children.push(ruleWithChildren);
        } else {
          rootRules.push(ruleWithChildren);
        }
      });

      return NextResponse.json({ success: true, data: rootRules });
    }

    return NextResponse.json({ success: true, data: rules });
  } catch (error) {
    console.error("Error fetching section rules:", error);
    return NextResponse.json({ success: false, message: "Lỗi khi tải danh sách rules" }, { status: 500 });
  }
}

// POST /api/admin/section-rules - Create a new section rule
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Không có quyền truy cập" }, { status: 403 });
    }

    const body = await req.json();
    const {
      sectionType,
      title,
      requirements,
      correctExample,
      incorrectExample,
      aiPrompt,
      priority,
      weight,
      level,
      order,
      circularId,
      parentId,
      isActive,
    } = body;

    if (!sectionType || !title || !requirements || !aiPrompt) {
      return NextResponse.json({ success: false, message: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }

    // Validate circularId if provided
    if (circularId) {
      const circular = await prisma.circularDocument.findUnique({
        where: { id: circularId },
        select: { id: true, isActive: true },
      });
      if (!circular || !circular.isActive) {
        return NextResponse.json({ success: false, message: "Công văn không hợp lệ" }, { status: 400 });
      }
    }

    // Validate parentId if provided
    if (parentId) {
      const parent = await prisma.sectionRule.findUnique({
        where: { id: parentId },
        select: { id: true, level: true },
      });
      if (!parent) {
        return NextResponse.json({ success: false, message: "Parent rule không tồn tại" }, { status: 400 });
      }
      // Ensure level is greater than parent's level
      if (level && level <= parent.level) {
        return NextResponse.json({ success: false, message: "Level phải lớn hơn parent" }, { status: 400 });
      }
    }

    const rule = await prisma.sectionRule.create({
      data: {
        sectionType,
        title,
        requirements,
        correctExample,
        incorrectExample,
        aiPrompt,
        priority: priority ?? 0,
        weight: weight ?? 1.0,
        level: level ?? 3, // Default to section level
        order: order ?? 0,
        circularId: circularId || null,
        parentId: parentId || null,
        isActive: isActive ?? true,
        createdBy: session.user.id,
      },
      include: {
        circular: { select: { id: true, code: true, title: true } },
        parent: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json({ success: true, data: rule, message: "Tạo rule thành công" }, { status: 201 });
  } catch (error) {
    console.error("Error creating section rule:", error);
    return NextResponse.json({ success: false, message: "Lỗi khi tạo rule" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/admin/circulars/[id]/rules - Get all rules for a specific circular
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Không có quyền truy cập" }, { status: 403 });
    }

    const { id } = await context.params;
    const { searchParams } = new URL(req.url);
    const includeGlobal = searchParams.get("includeGlobal") === "true";
    const hierarchy = searchParams.get("hierarchy") !== "false"; // Default true

    // Check if circular exists
    const circular = await prisma.circularDocument.findUnique({
      where: { id },
      select: { id: true, code: true, title: true, isActive: true },
    });

    if (!circular) {
      return NextResponse.json({ success: false, message: "Không tìm thấy Công văn" }, { status: 404 });
    }

    // Build where clause
    const whereClause: any = {
      OR: [
        { circularId: id },
      ],
    };

    if (includeGlobal) {
      whereClause.OR.push({ circularId: null });
    }

    // Fetch rules
    const rules = await prisma.sectionRule.findMany({
      where: whereClause,
      include: {
        creator: { select: { id: true, name: true, email: true } },
        parent: { select: { id: true, title: true } },
        _count: { select: { children: true } },
      },
      orderBy: [
        { circularId: "desc" }, // Circular-specific rules first
        { level: "asc" },
        { order: "asc" },
        { priority: "desc" },
        { title: "asc" },
      ],
    });

    // Build hierarchical structure
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

      return NextResponse.json({
        success: true,
        data: {
          circular,
          rules: rootRules,
          stats: {
            total: rules.length,
            circularSpecific: rules.filter(r => r.circularId === id).length,
            global: rules.filter(r => r.circularId === null).length,
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        circular,
        rules,
        stats: {
          total: rules.length,
          circularSpecific: rules.filter(r => r.circularId === id).length,
          global: rules.filter(r => r.circularId === null).length,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching circular rules:", error);
    return NextResponse.json({ success: false, message: "Lỗi khi tải rules" }, { status: 500 });
  }
}

// POST /api/admin/circulars/[id]/rules - Create a new rule for this circular
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Không có quyền truy cập" }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await req.json();

    // Check if circular exists
    const circular = await prisma.circularDocument.findUnique({
      where: { id },
      select: { id: true, isActive: true },
    });

    if (!circular) {
      return NextResponse.json({ success: false, message: "Không tìm thấy Công văn" }, { status: 404 });
    }

    if (!circular.isActive) {
      return NextResponse.json({ success: false, message: "Công văn đã bị vô hiệu hóa" }, { status: 400 });
    }

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
      parentId,
      isActive,
    } = body;

    if (!sectionType || !title || !requirements || !aiPrompt) {
      return NextResponse.json({ success: false, message: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }

    // Validate parentId if provided
    if (parentId) {
      const parent = await prisma.sectionRule.findUnique({
        where: { id: parentId },
        select: { id: true, level: true, circularId: true },
      });
      if (!parent) {
        return NextResponse.json({ success: false, message: "Parent rule không tồn tại" }, { status: 400 });
      }
      // Parent should belong to this circular or be global
      if (parent.circularId && parent.circularId !== id) {
        return NextResponse.json({ success: false, message: "Parent thuộc Công văn khác" }, { status: 400 });
      }
      if (level && parent.level && level <= parent.level) {
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
        level: level ?? 3,
        order: order ?? 0,
        circularId: id, // Always link to this circular
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
    console.error("Error creating circular rule:", error);
    return NextResponse.json({ success: false, message: "Lỗi khi tạo rule" }, { status: 500 });
  }
}

// PUT /api/admin/circulars/[id]/rules - Bulk update rules for this circular
export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Không có quyền truy cập" }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await req.json();
    const { rules } = body;

    // Check if circular exists
    const circular = await prisma.circularDocument.findUnique({
      where: { id },
      select: { id: true, isActive: true },
    });

    if (!circular) {
      return NextResponse.json({ success: false, message: "Không tìm thấy Công văn" }, { status: 404 });
    }

    if (!Array.isArray(rules)) {
      return NextResponse.json({ success: false, message: "Invalid rules format" }, { status: 400 });
    }

    // Process bulk updates in a transaction
    const results = await prisma.$transaction(async (tx) => {
      const updatedRules = [];

      for (const ruleData of rules) {
        if (ruleData.id) {
          // Update existing rule
          const existing = await tx.sectionRule.findUnique({ where: { id: ruleData.id } });
          if (existing && (existing.circularId === id || existing.circularId === null)) {
            const updated = await tx.sectionRule.update({
              where: { id: ruleData.id },
              data: {
                ...(ruleData.title !== undefined && { title: ruleData.title }),
                ...(ruleData.requirements !== undefined && { requirements: ruleData.requirements }),
                ...(ruleData.aiPrompt !== undefined && { aiPrompt: ruleData.aiPrompt }),
                ...(ruleData.correctExample !== undefined && { correctExample: ruleData.correctExample }),
                ...(ruleData.incorrectExample !== undefined && { incorrectExample: ruleData.incorrectExample }),
                ...(ruleData.priority !== undefined && { priority: ruleData.priority }),
                ...(ruleData.weight !== undefined && { weight: ruleData.weight }),
                ...(ruleData.level !== undefined && { level: ruleData.level }),
                ...(ruleData.order !== undefined && { order: ruleData.order }),
                ...(ruleData.parentId !== undefined && { parentId: ruleData.parentId || null }),
                ...(ruleData.isActive !== undefined && { isActive: ruleData.isActive }),
              },
            });
            updatedRules.push(updated);
          }
        } else {
          // Create new rule
          const created = await tx.sectionRule.create({
            data: {
              sectionType: ruleData.sectionType,
              title: ruleData.title,
              requirements: ruleData.requirements,
              aiPrompt: ruleData.aiPrompt,
              correctExample: ruleData.correctExample,
              incorrectExample: ruleData.incorrectExample,
              priority: ruleData.priority ?? 0,
              weight: ruleData.weight ?? 1.0,
              level: ruleData.level ?? 3,
              order: ruleData.order ?? 0,
              circularId: id,
              parentId: ruleData.parentId || null,
              isActive: ruleData.isActive ?? true,
              createdBy: session.user.id,
            },
          });
          updatedRules.push(created);
        }
      }

      return updatedRules;
    });

    return NextResponse.json({ success: true, data: results, message: `Cập nhật ${results.length} rules thành công` });
  } catch (error) {
    console.error("Error bulk updating circular rules:", error);
    return NextResponse.json({ success: false, message: "Lỗi khi cập nhật rules" }, { status: 500 });
  }
}

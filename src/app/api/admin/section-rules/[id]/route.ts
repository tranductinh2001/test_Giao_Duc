import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/admin/section-rules/[id] - Get a single section rule with children
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Không có quyền truy cập" }, { status: 403 });
    }

    const { id } = await context.params;
    const rule = await prisma.sectionRule.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        circular: { select: { id: true, code: true, title: true } },
        parent: { select: { id: true, title: true } },
        children: {
          include: {
            creator: { select: { id: true, name: true } },
          },
          orderBy: { order: "asc" },
        },
      },
    });

    if (!rule) {
      return NextResponse.json({ success: false, message: "Không tìm thấy rule" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: rule });
  } catch (error) {
    console.error("Error fetching section rule:", error);
    return NextResponse.json({ success: false, message: "Lỗi khi tải rule" }, { status: 500 });
  }
}

// PUT /api/admin/section-rules/[id] - Update a section rule
export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Không có quyền truy cập" }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await req.json();

    const existing = await prisma.sectionRule.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, message: "Không tìm thấy rule" }, { status: 404 });
    }

    // Validate circularId if provided
    if (body.circularId) {
      const circular = await prisma.circularDocument.findUnique({
        where: { id: body.circularId },
        select: { id: true, isActive: true },
      });
      if (!circular || !circular.isActive) {
        return NextResponse.json({ success: false, message: "Công văn không hợp lệ" }, { status: 400 });
      }
    }

    // Validate parentId if provided
    if (body.parentId) {
      const parent = await prisma.sectionRule.findUnique({
        where: { id: body.parentId },
        select: { id: true, level: true },
      });
      if (!parent) {
        return NextResponse.json({ success: false, message: "Parent rule không tồn tại" }, { status: 400 });
      }
      if (body.level && body.level <= parent.level) {
        return NextResponse.json({ success: false, message: "Level phải lớn hơn parent" }, { status: 400 });
      }
    }

    // Prevent circular parent reference
    if (body.parentId === id) {
      return NextResponse.json({ success: false, message: "Rule không thể là parent của chính nó" }, { status: 400 });
    }

    const rule = await prisma.sectionRule.update({
      where: { id },
      data: {
        ...(body.sectionType !== undefined && { sectionType: body.sectionType }),
        ...(body.title !== undefined && { title: body.title }),
        ...(body.requirements !== undefined && { requirements: body.requirements }),
        ...(body.correctExample !== undefined && { correctExample: body.correctExample }),
        ...(body.incorrectExample !== undefined && { incorrectExample: body.incorrectExample }),
        ...(body.aiPrompt !== undefined && { aiPrompt: body.aiPrompt }),
        ...(body.priority !== undefined && { priority: body.priority }),
        ...(body.weight !== undefined && { weight: body.weight }),
        ...(body.level !== undefined && { level: body.level }),
        ...(body.order !== undefined && { order: body.order }),
        ...(body.circularId !== undefined && { circularId: body.circularId || null }),
        ...(body.parentId !== undefined && { parentId: body.parentId || null }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
      include: {
        circular: { select: { id: true, code: true, title: true } },
        parent: { select: { id: true, title: true } },
        children: {
          select: { id: true, title: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: rule, message: "Cập nhật rule thành công" });
  } catch (error) {
    console.error("Error updating section rule:", error);
    return NextResponse.json({ success: false, message: "Lỗi khi cập nhật rule" }, { status: 500 });
  }
}

// DELETE /api/admin/section-rules/[id] - Delete a section rule
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Không có quyền truy cập" }, { status: 403 });
    }

    const { id } = await context.params;
    const existing = await prisma.sectionRule.findUnique({
      where: { id },
      include: { children: true },
    });
    if (!existing) {
      return NextResponse.json({ success: false, message: "Không tìm thấy rule" }, { status: 404 });
    }

    // Move children to parent (or make them root)
    if (existing.children.length > 0) {
      await prisma.sectionRule.updateMany({
        where: { parentId: id },
        data: { parentId: existing.parentId },
      });
    }

    await prisma.sectionRule.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Xóa rule thành công" });
  } catch (error) {
    console.error("Error deleting section rule:", error);
    return NextResponse.json({ success: false, message: "Lỗi khi xóa rule" }, { status: 500 });
  }
}

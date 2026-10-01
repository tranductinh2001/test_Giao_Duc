import { prisma } from "@/lib/prisma";

export class CategoryRepository {
  async findMany() {
    return prisma.category.findMany({
      orderBy: [{ name: "asc" }, { createdAt: "desc" }],
      include: {
        children: {
          orderBy: [{ name: "asc" }, { createdAt: "desc" }],
        },
        _count: {
          select: { questions: true },
        },
      },
    });
  }

  async findFlat() {
    return prisma.category.findMany({
      orderBy: [{ name: "asc" }, { createdAt: "desc" }],
      include: {
        _count: {
          select: { questions: true },
        },
      },
    });
  }

  async findById(id: string) {
    return prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        children: {
          orderBy: [{ name: "asc" }, { createdAt: "desc" }],
        },
        _count: {
          select: { questions: true },
        },
      },
    });
  }

  async create(data: { name: string; description?: string | null; parentId?: string | null }) {
    return prisma.category.create({
      data: {
        name: data.name,
        description: data.description,
        parentId: data.parentId || null,
      },
    });
  }

  async update(id: string, data: { name?: string; description?: string | null; parentId?: string | null }) {
    return prisma.category.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        parentId: data.parentId === undefined ? undefined : (data.parentId || null),
      },
    });
  }

  async delete(id: string) {
    // Check if category has subcategories or questions
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        children: true,
        _count: {
          select: { questions: true },
        },
      },
    });

    if (!category) {
      throw new Error("CATEGORY_NOT_FOUND");
    }

    if (category.children.length > 0) {
      throw new Error("CATEGORY_HAS_CHILDREN");
    }

    if (category._count.questions > 0) {
      throw new Error("CATEGORY_HAS_QUESTIONS");
    }

    return prisma.category.delete({
      where: { id },
    });
  }
}

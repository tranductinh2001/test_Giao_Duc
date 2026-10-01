import { prisma } from "@/lib/prisma";
import { CategoryRepository } from "../repositories/CategoryRepository";

export interface CategoryTreeNode {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  questionCount: number;
  children: CategoryTreeNode[];
}

export class CategoryService {
  private categoryRepository = new CategoryRepository();

  private async getActiveQuestionCounts(): Promise<Map<string, number>> {
    const questionCounts = await prisma.question.groupBy({
      by: ["categoryId"],
      _count: { id: true },
    });

    const countsMap = new Map<string, number>();
    questionCounts.forEach((qc) => {
      countsMap.set(qc.categoryId, qc._count.id);
    });
    return countsMap;
  }

  async getCategoryTree(): Promise<CategoryTreeNode[]> {
    // Get all categories flat
    const categories = await prisma.category.findMany({
      orderBy: [{ name: "asc" }, { createdAt: "desc" }],
    });

    const countsMap = await this.getActiveQuestionCounts();

    // Build parent -> children map
    const parentToChildren = new Map<string | null, CategoryTreeNode[]>();
    categories.forEach((cat) => {
      const node: CategoryTreeNode = {
        id: cat.id,
        name: cat.name,
        description: cat.description,
        parentId: cat.parentId,
        createdAt: cat.createdAt,
        updatedAt: cat.updatedAt,
        questionCount: 0,
        children: [],
      };

      const parentKey = cat.parentId;
      const siblings = parentToChildren.get(parentKey) || [];
      siblings.push(node);
      parentToChildren.set(parentKey, siblings);
    });

    // Calculate recursive question counts
    const memo = new Map<string, number>();
    const calculateRecursiveCount = (catId: string): number => {
      if (memo.has(catId)) return memo.get(catId)!;

      const direct = countsMap.get(catId) || 0;
      const children = parentToChildren.get(catId) || [];
      let total = direct;

      for (const child of children) {
        total += calculateRecursiveCount(child.id);
      }

      memo.set(catId, total);
      return total;
    };

    // Set question counts for all nodes
    const allNodes = parentToChildren.get(null) || [];
    const setQuestionCounts = (nodes: CategoryTreeNode[]) => {
      for (const node of nodes) {
        node.questionCount = calculateRecursiveCount(node.id);
        setQuestionCounts(node.children);
      }
    };
    setQuestionCounts(allNodes);

    // Recursively build tree structure
    const buildTree = (parentId: string | null): CategoryTreeNode[] => {
      const children = parentToChildren.get(parentId) || [];

      // Sort by name
      children.sort((a, b) => a.name.localeCompare(b.name));

      // For each node, build its children
      for (const child of children) {
        child.children = buildTree(child.id);
      }

      return children;
    };

    // Get root nodes (parentId = null)
    const rootNodes = buildTree(null);

    return rootNodes;
  }

  async getFlatCategories() {
    const categories = await prisma.category.findMany({
      orderBy: [{ name: "asc" }, { createdAt: "desc" }],
    });
    const countsMap = await this.getActiveQuestionCounts();

    // Build parent -> children map
    const parentToChildren = new Map<string | null, typeof categories>();
    categories.forEach((cat) => {
      const parentKey = cat.parentId;
      const siblings = parentToChildren.get(parentKey) || [];
      siblings.push(cat);
      parentToChildren.set(parentKey, siblings);
    });

    // Calculate recursive question counts
    const memo = new Map<string, number>();
    const calculateRecursiveCount = (catId: string): number => {
      if (memo.has(catId)) return memo.get(catId)!;

      const direct = countsMap.get(catId) || 0;
      const children = parentToChildren.get(catId) || [];
      let total = direct;

      for (const child of children) {
        total += calculateRecursiveCount(child.id);
      }

      memo.set(catId, total);
      return total;
    };

    return categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      description: cat.description,
      parentId: cat.parentId,
      createdAt: cat.createdAt,
      updatedAt: cat.updatedAt,
      questionCount: calculateRecursiveCount(cat.id),
    }));
  }

  async getCategoryDetail(id: string) {
    return this.categoryRepository.findById(id);
  }

  async createCategory(data: { name: string; description?: string | null; parentId?: string | null }) {
    return this.categoryRepository.create(data);
  }

  async updateCategory(id: string, data: { name?: string; description?: string | null; parentId?: string | null }) {
    return this.categoryRepository.update(id, data);
  }

  async deleteCategory(id: string) {
    return this.categoryRepository.delete(id);
  }
}

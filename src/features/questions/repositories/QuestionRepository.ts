import { prisma } from "@/lib/prisma";
import { QuestionInput } from "../schemas";

export class QuestionRepository {
  async findMany(filters: {
    categoryId?: string;
    difficulty?: "EASY" | "MEDIUM" | "HARD";
    search?: string;
    take?: number;
    skip?: number;
  }) {
    const where: any = {};

    if (filters.categoryId) {
      // also get questions in subcategories
      const subcategories = await this.getSubcategoryIds(filters.categoryId);
      where.categoryId = { in: [filters.categoryId, ...subcategories] };
    }

    if (filters.difficulty) {
      where.difficulty = filters.difficulty;
    }

    if (filters.search) {
      where.OR = [
        { content: { contains: filters.search, mode: "insensitive" } },
        { explanation: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    return prisma.question.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: filters.take,
      skip: filters.skip,
      include: {
        choices: true,
        category: {
          select: { name: true },
        },
      },
    });
  }

  async count(filters: {
    categoryId?: string;
    difficulty?: "EASY" | "MEDIUM" | "HARD";
    search?: string;
  }) {
    const where: any = {};

    if (filters.categoryId) {
      const subcategories = await this.getSubcategoryIds(filters.categoryId);
      where.categoryId = { in: [filters.categoryId, ...subcategories] };
    }

    if (filters.difficulty) {
      where.difficulty = filters.difficulty;
    }

    if (filters.search) {
      where.OR = [
        { content: { contains: filters.search, mode: "insensitive" } },
        { explanation: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    return prisma.question.count({ where });
  }

  async findById(id: string) {
    return prisma.question.findUnique({
      where: { id },
      include: {
        choices: true,
        category: true,
      },
    });
  }

  async create(data: QuestionInput) {
    return prisma.question.create({
      data: {
        content: data.content,
        explanation: data.explanation,
        difficulty: data.difficulty,
        categoryId: data.categoryId,
        choices: {
          create: data.choices.map((c) => ({
            content: c.content,
            isCorrect: c.isCorrect,
          })),
        },
      },
      include: {
        choices: true,
      },
    });
  }

  async update(id: string, data: QuestionInput) {
    // Delete existing choices first then recreate them inside a transaction
    return prisma.$transaction(async (tx) => {
      await tx.choice.deleteMany({
        where: { questionId: id },
      });

      return tx.question.update({
        where: { id },
        data: {
          content: data.content,
          explanation: data.explanation,
          difficulty: data.difficulty,
          categoryId: data.categoryId,
          choices: {
            create: data.choices.map((c) => ({
              content: c.content,
              isCorrect: c.isCorrect,
            })),
          },
        },
        include: {
          choices: true,
        },
      });
    });
  }

  async delete(id: string) {
    return prisma.question.delete({
      where: { id },
    });
  }

  // Bulk creation — interactive transaction with generous timeout to handle large imports (100+ questions)
  async createMany(questions: QuestionInput[]) {
    const results: { id: string }[] = [];

    // Process in chunks of 20 to avoid holding the DB connection too long per tx
    const CHUNK_SIZE = 20;
    for (let i = 0; i < questions.length; i += CHUNK_SIZE) {
      const chunk = questions.slice(i, i + CHUNK_SIZE);

      const created = await prisma.$transaction(
        async (tx) => {
          const chunkResults: { id: string }[] = [];
          for (const q of chunk) {
            const question = await tx.question.create({
              data: {
                content: q.content,
                explanation: q.explanation,
                difficulty: q.difficulty,
                categoryId: q.categoryId,
                choices: {
                  create: q.choices.map((c) => ({
                    content: c.content,
                    isCorrect: c.isCorrect,
                  })),
                },
              },
              select: { id: true },
            });
            chunkResults.push(question);
          }
          return chunkResults;
        },
        {
          maxWait: 10000,  // wait up to 10s to acquire connection
          timeout: 30000,  // allow up to 30s per chunk transaction
        }
      );

      results.push(...created);
    }

    return results;
  }

  private async getSubcategoryIds(parentId: string): Promise<string[]> {
    const subcats = await prisma.category.findMany({
      where: { parentId },
      select: { id: true },
    });

    const ids = subcats.map((s) => s.id);
    for (const id of ids) {
      const childrenIds = await this.getSubcategoryIds(id);
      ids.push(...childrenIds);
    }
    return ids;
  }
}

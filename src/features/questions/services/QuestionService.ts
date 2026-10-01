import { QuestionRepository } from "../repositories/QuestionRepository";
import { QuestionInput } from "../schemas";

export class QuestionService {
  private questionRepository = new QuestionRepository();

  async getQuestions(params: {
    categoryId?: string;
    difficulty?: "EASY" | "MEDIUM" | "HARD";
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.questionRepository.findMany({
        categoryId: params.categoryId,
        difficulty: params.difficulty,
        search: params.search,
        take: limit,
        skip,
      }),
      this.questionRepository.count({
        categoryId: params.categoryId,
        difficulty: params.difficulty,
        search: params.search,
      }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getQuestionDetail(id: string) {
    const question = await this.questionRepository.findById(id);
    if (!question) {
      throw new Error("QUESTION_NOT_FOUND");
    }
    return question;
  }

  async createQuestion(data: QuestionInput) {
    return this.questionRepository.create(data);
  }

  async updateQuestion(id: string, data: QuestionInput) {
    const existing = await this.questionRepository.findById(id);
    if (!existing) {
      throw new Error("QUESTION_NOT_FOUND");
    }
    return this.questionRepository.update(id, data);
  }

  async deleteQuestion(id: string) {
    const existing = await this.questionRepository.findById(id);
    if (!existing) {
      throw new Error("QUESTION_NOT_FOUND");
    }
    return this.questionRepository.delete(id);
  }

  async bulkSaveQuestions(questions: QuestionInput[]) {
    if (!questions || questions.length === 0) {
      throw new Error("NO_QUESTIONS_PROVIDED");
    }
    return this.questionRepository.createMany(questions);
  }
}

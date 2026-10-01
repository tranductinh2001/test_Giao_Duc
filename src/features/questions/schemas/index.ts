import { z } from "zod";

export const CategorySchema = z.object({
  name: z.string().min(1, "Tên chuyên mục không được để trống"),
  description: z.string().optional().nullable(),
  parentId: z.string().uuid("ID chuyên mục cha không hợp lệ").optional().nullable(),
});

export const ChoiceSchema = z.object({
  id: z.string().optional(),
  content: z.string().min(1, "Nội dung phương án không được để trống"),
  isCorrect: z.boolean().default(false),
});

export const QuestionSchema = z.object({
  content: z.string().min(5, "Nội dung câu hỏi tối thiểu 5 ký tự"),
  explanation: z.string().optional().nullable(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
  categoryId: z.string().uuid("ID chuyên mục không hợp lệ"),
  choices: z.array(ChoiceSchema).min(2, "Phải có ít nhất 2 phương án").refine(
    (choices) => choices.some((c) => c.isCorrect),
    { message: "Phải có ít nhất một phương án đúng" }
  ),
});

export const ExcelRowSchema = z.object({
  No: z.number().or(z.string().transform(val => parseInt(val, 10))),
  QuestionContent: z.string().min(5, "Nội dung câu hỏi tối thiểu phải có 5 ký tự"),
  ChoiceA: z.string().min(1, "Phương án A không được để trống"),
  ChoiceB: z.string().min(1, "Phương án B không được để trống"),
  ChoiceC: z.string().min(1, "Phương án C không được để trống"),
  ChoiceD: z.string().min(1, "Phương án D không được để trống"),
  CorrectAnswer: z.string().toUpperCase().refine((val) => ["A", "B", "C", "D"].includes(val), {
    message: "Đáp án đúng phải là A, B, C hoặc D"
  }),
  Explanation: z.string().optional().default(""),
  Difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM")
});

export type CategoryInput = z.infer<typeof CategorySchema>;
export type QuestionInput = z.infer<typeof QuestionSchema>;
export type ExcelRowData = z.infer<typeof ExcelRowSchema>;

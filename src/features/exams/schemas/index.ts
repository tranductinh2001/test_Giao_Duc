import { z } from "zod";

export const MatrixItemSchema = z.object({
  categoryId: z.string().uuid(),
  count: z.number().int().min(1),
});

export const CreateExamSchema = z.object({
  title: z.string().min(3, "Tiêu đề đề thi phải có ít nhất 3 ký tự"),
  description: z.string().optional().nullable(),
  timeLimit: z.number().int().min(60, "Thời gian thi phải ít nhất 60 giây"),
  matrix: z.array(MatrixItemSchema).min(1, "Ma trận đề thi phải có ít nhất 1 chuyên mục"),
  categoryId: z.string().uuid().optional().nullable(),
});

export const SubmitAnswerSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string().uuid(),
      selectedChoiceId: z.string().uuid().nullable(),
    })
  ),
});

export const ActivateLicenseSchema = z.object({
  code: z.string().min(1, "Mã License không được để trống"),
});

export type CreateExamInput = z.infer<typeof CreateExamSchema>;
export type SubmitAnswerInput = z.infer<typeof SubmitAnswerSchema>;

import { z } from "zod";

export const ActivateLicenseSchema = z.object({
  code: z.string().trim().min(1, "License code cannot be empty"),
});

export const GenerateLicensesSchema = z.object({
  durationDays: z.number().int().min(1).max(3650),
  count: z.number().int().min(1).max(100),
});

export type ActivateLicenseInput = z.infer<typeof ActivateLicenseSchema>;
export type GenerateLicensesInput = z.infer<typeof GenerateLicensesSchema>;

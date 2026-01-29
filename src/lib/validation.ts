import { z } from "zod";

export const usernameSchema = z
  .string()
  .min(3)
  .max(24)
  .regex(/^[a-zA-Z0-9_]+$/);

export const passwordSchema = z.string().min(6).max(64);

export const registerSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
});

export const loginSchema = registerSchema;

export const listIdSchema = z.string().uuid();

export const testStartSchema = z.object({
  listId: z.string().uuid().nullable(),
  mode: z.enum(["english-to-chinese", "chinese-to-english"]),
  shuffle: z.boolean().optional(),
  wrongOnly: z.boolean().optional(),
});

export const testUpdateSchema = z.object({
  sessionId: z.string().uuid(),
  wordId: z.string().uuid(),
  correct: z.boolean(),
  currentIndex: z.number().int().nonnegative(),
  correctIds: z.array(z.string().uuid()),
  incorrectIds: z.array(z.string().uuid()),
});

export const wordListTitleSchema = z.string().min(1).max(80);

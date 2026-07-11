import { z } from 'zod';

export const idSchema = z.string().min(1).max(128);
export const tokenAmountSchema = z.string().regex(/^\d+$/);
export const signedTokenAmountSchema = z.string().regex(/^-?\d+$/);
export const utcDateTimeSchema = z.string().datetime({ offset: true });
export const idempotencyKeySchema = z.string().min(8).max(128);

export const MODEL_IDS = [
  'claude-fable-5',
  'claude-haiku-4-5',
  'claude-haiku-4-5-20251001',
  'claude-opus-4-6',
  'claude-opus-4-7',
  'claude-opus-4-8',
  'claude-sonnet-4-6',
  'claude-sonnet-5',
  'deepseek-v4-flash',
  'deepseek-v4-pro',
  'gemini-3.1-pro-preview',
  'gemini-3.5-flash',
  'glm-5.2',
  'gpt-5.4-mini',
  'gpt-5.4',
  'gpt-5.5',
  'gpt-5.6-luna',
  'gpt-5.6-sol',
  'gpt-5.6-terra',
  'gpt-image-2',
] as const;

export const modelIdSchema = z.enum(MODEL_IDS);

export type ModelId = z.infer<typeof modelIdSchema>;

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    requestId: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
});

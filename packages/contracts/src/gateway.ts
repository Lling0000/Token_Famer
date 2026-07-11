import { z } from 'zod';

import { modelIdSchema, tokenAmountSchema } from './common';

export const usageSchema = z.object({
  inputTokens: tokenAmountSchema,
  outputTokens: tokenAmountSchema,
  cachedInputTokens: tokenAmountSchema.default('0'),
  cacheCreationTokens: tokenAmountSchema.default('0'),
});

export const modelSchema = z.object({
  id: modelIdSchema,
  object: z.literal('model'),
  owned_by: z.string(),
});

export const apiKeySchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(80),
  prefix: z.string(),
  allowedModels: z.array(modelIdSchema),
  createdAt: z.string().datetime({ offset: true }),
  lastUsedAt: z.string().datetime({ offset: true }).nullable(),
  revokedAt: z.string().datetime({ offset: true }).nullable(),
});

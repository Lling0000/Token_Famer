import { z } from 'zod';

import { idSchema, modelIdSchema, tokenAmountSchema, utcDateTimeSchema } from './common';

export const plotStateSchema = z.enum([
  'locked',
  'empty',
  'growing',
  'mature',
  'harvested',
  'clearing',
]);

export const plotSchema = z.object({
  id: idSchema,
  index: z.number().int().min(0).max(23),
  state: plotStateSchema,
  quality: z.number().int().min(0).max(3),
  cropLevel: z.number().int().min(1).max(15).nullable(),
  modelId: modelIdSchema.nullable(),
  plantedAt: utcDateTimeSchema.nullable(),
  matureAt: utcDateTimeSchema.nullable(),
  fruitNum: z.number().int().nonnegative(),
  leftFruitNum: z.number().int().nonnegative(),
  stoleNum: z.number().int().nonnegative(),
  stealable: z.boolean(),
  event: z.enum(['none', 'dry', 'weed', 'pest']).default('none'),
});

export const walletSchema = z.object({
  modelId: modelIdSchema,
  available: tokenAmountSchema,
  reserved: tokenAmountSchema,
});

export const tokenPackSchema = z.object({
  id: idSchema,
  modelId: modelIdSchema,
  amount: tokenAmountSchema,
  source: z.enum(['harvest', 'steal', 'welcome', 'purchase', 'adjustment']),
  activatedAt: utcDateTimeSchema.nullable(),
  createdAt: utcDateTimeSchema,
});

export const friendSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(40),
  level: z.number().int().min(1).max(99),
  intimacyLevel: z.number().int().min(0).max(5),
  stealablePlots: z.number().int().min(0).max(24),
  online: z.boolean(),
  avatarSeed: z.number().int().nonnegative(),
});

export const bootstrapSchema = z.object({
  profile: z.object({
    id: idSchema,
    name: z.string(),
    level: z.number().int(),
    experience: z.number().int().nonnegative(),
    nextLevelExperience: z.number().int().positive(),
    petals: z.number().int().nonnegative(),
  }),
  models: z.array(modelIdSchema),
  creditBalance: tokenAmountSchema,
  plots: z.array(plotSchema).length(24),
  friends: z.array(friendSchema),
  tokenPacks: z.array(tokenPackSchema),
});

export const plantRequestSchema = z.object({
  cropLevel: z.number().int().min(0).max(15),
  modelId: modelIdSchema,
});

export const maintainRequestSchema = z.object({
  action: z.enum(['water', 'weed', 'pest', 'guaranteed']),
});

export const leaderboardEntrySchema = z.object({
  rank: z.number().int().positive(),
  userId: idSchema,
  displayName: z.string(),
  level: z.number().int().positive(),
  score: tokenAmountSchema,
  isCurrentUser: z.boolean(),
});

export type Bootstrap = z.infer<typeof bootstrapSchema>;
export type Plot = z.infer<typeof plotSchema>;
export type Wallet = z.infer<typeof walletSchema>;
export type Friend = z.infer<typeof friendSchema>;
export type TokenPack = z.infer<typeof tokenPackSchema>;

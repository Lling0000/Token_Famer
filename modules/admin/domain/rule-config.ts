import { z } from 'zod';

export const harvestRuleConfigSchema = z.object({
  version: z.number().int().positive(),
  outcomes: z
    .array(
      z.object({
        upperExclusive: z.number().int().positive().max(10_000),
        multiplierBasisPoints: z.number().int().positive(),
      }),
    )
    .length(4),
  eventChanceBasisPoints: z.number().int().min(0).max(10_000),
  freeTreatmentSuccessBasisPoints: z.number().int().min(0).max(10_000),
});

export type HarvestRuleConfig = z.infer<typeof harvestRuleConfigSchema>;

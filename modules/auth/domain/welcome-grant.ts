export const WELCOME_GRANT_AMOUNT = 80_000n;
export const WELCOME_GRANT_ACCOUNT = 'token-credit';

export type WelcomeGrant = Readonly<{
  userId: string;
  modelId: typeof WELCOME_GRANT_ACCOUNT;
  amount: bigint;
  businessReference: string;
}>;

export const buildWelcomeGrants = (userId: string): readonly WelcomeGrant[] => [
  {
    userId,
    modelId: WELCOME_GRANT_ACCOUNT,
    amount: WELCOME_GRANT_AMOUNT,
    businessReference: `welcome:${userId}:unified-v1`,
  },
];

import type { WelcomeGrant } from '../domain/welcome-grant';

export interface WelcomeGrantRepository {
  grantOnce(userId: string, grants: readonly WelcomeGrant[], claimedAt: Date): Promise<boolean>;
}

import { buildWelcomeGrants } from '../domain/welcome-grant';
import type { WelcomeGrantRepository } from '../ports/auth-repository';

export class ClaimWelcomeGrant {
  public constructor(private readonly repository: WelcomeGrantRepository) {}

  public execute(userId: string, claimedAt: Date): Promise<boolean> {
    return this.repository.grantOnce(userId, buildWelcomeGrants(userId), claimedAt);
  }
}

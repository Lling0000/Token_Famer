import { mergeConfig } from 'vitest/config';

import { sharedTestConfig } from './vitest.shared';

export default mergeConfig(sharedTestConfig, {
  test: { include: ['**/*.contract.test.ts'], testTimeout: 30_000 },
});

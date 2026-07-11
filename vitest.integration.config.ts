import { mergeConfig } from 'vitest/config';

import { sharedTestConfig } from './vitest.shared';

export default mergeConfig(sharedTestConfig, {
  test: { include: ['**/*.integration.test.ts'], testTimeout: 30_000, hookTimeout: 30_000 },
});

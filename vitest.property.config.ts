import { mergeConfig } from 'vitest/config';

import { sharedTestConfig } from './vitest.shared';

export default mergeConfig(sharedTestConfig, {
  test: { include: ['**/*.property.test.ts'] },
});

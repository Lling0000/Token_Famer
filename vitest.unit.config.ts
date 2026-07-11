import { mergeConfig } from 'vitest/config';

import { sharedTestConfig } from './vitest.shared';

export default mergeConfig(sharedTestConfig, {
  test: {
    include: ['packages/**/*.test.ts', 'modules/**/*.test.ts', 'apps/**/*.unit.test.ts'],
    exclude: [
      '**/*.property.test.ts',
      '**/*.integration.test.ts',
      '**/*.contract.test.ts',
      '**/node_modules/**',
    ],
  },
});

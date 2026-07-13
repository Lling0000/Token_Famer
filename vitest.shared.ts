import { defineConfig } from 'vitest/config';

export const sharedTestConfig = defineConfig({
  test: {
    environment: 'node',
    passWithNoTests: false,
    restoreMocks: true,
    clearMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
        branches: 75,
      },
    },
  },
});

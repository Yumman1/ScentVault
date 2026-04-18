import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.spec.ts', 'tests/integration/**/*.spec.ts'],
    exclude: ['tests/e2e/**', 'node_modules', 'dist'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    // Integration tests mutate a shared Supabase project; run sequentially.
    fileParallelism: false,
    sequence: {
      concurrent: false,
    },
    reporters: ['default'],
    coverage: {
      enabled: false,
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['lib/**', 'services/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});

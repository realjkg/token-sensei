import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    alias: {
      // Mirror tsconfig.json paths so test imports of '@/...' resolve correctly.
      '@': path.resolve(__dirname, './src'),
    },
  },
});


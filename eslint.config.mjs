// ESLint flat config (ESLint v10+, react-hooks v5, typescript-eslint v8).
// Equivalent to the old .eslintrc.cjs rules, using the flat config API.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  // Ignore build output and JS config files.
  {
    ignores: [
      'dist/**',
      '.next/**',
      'eslint.config.js',
      '.eslintrc.cjs',   // legacy config file, not linted
      'next.config.js',
      'next-env.d.ts',   // Next.js generated, not linted
      'postcss.config.js',
      'tailwind.config.js',
      'vitest.config.ts',
    ],
  },
  // Base: eslint:recommended
  js.configs.recommended,
  // TypeScript: @typescript-eslint/recommended
  ...tseslint.configs.recommended,
  // React hooks: use the flat-config-aware 'recommended-latest' preset.
  reactHooks.configs['recommended-latest'],
  // Project-level overrides.
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // Disable rules introduced in typescript-eslint v8 recommended that flag
      // pre-existing code patterns not covered under the old v7 config.
      'preserve-caught-error': 'off',
    },
  },
);


import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import prettier from 'eslint-config-prettier';
import tsParser from '@typescript-eslint/parser';
import globals from 'globals';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...svelte.configs['flat/recommended'],
  prettier,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } }
  },
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parserOptions: { parser: tsParser }
    }
  },
  {
    files: ['postcss.config.cjs'],
    languageOptions: { globals: { module: 'readonly' } }
  },
  {
    files: ['src/app.d.ts'],
    rules: { '@typescript-eslint/no-empty-object-type': 'off' }
  },
  {
    files: ['src/lib/components/PreviewPane.svelte'],
    rules: { 'svelte/no-at-html-tags': 'off' }
  },
  {
    ignores: [
      '.svelte-kit/**',
      'build/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**'
    ]
  }
);

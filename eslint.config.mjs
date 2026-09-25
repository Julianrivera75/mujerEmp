import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['.next/**', 'node_modules/**', 'coverage/**', 'next-env.d.ts', 'tsconfig.tsbuildinfo'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      '@next/next': nextPlugin,
      'jsx-a11y': jsxA11y,
      'react-hooks': reactHooks,
    },
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      ...nextPlugin.configs['core-web-vitals'].rules,
      ...jsxA11y.flatConfigs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
      eqeqeq: ['error', 'always'],
      'no-console': 'error',
    },
  },
  {
    files: ['src/lib/log.ts', 'src/lib/client-log.ts', 'tests/**/*.ts'],
    rules: { 'no-console': 'off' },
  },
  {
    files: ['tests/**/*.ts'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: { globals: { ...globals.node } },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
);

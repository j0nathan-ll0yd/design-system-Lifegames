import tsParser from '@typescript-eslint/parser';
import eslintConfigPrettier from 'eslint-config-prettier';

export default [
  {
    files: ['vitest.config.ts'],
    languageOptions: {
      parser: tsParser,
    },
  },
  eslintConfigPrettier,
];

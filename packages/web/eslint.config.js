import tsParser from '@typescript-eslint/parser';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const lifegamesLocal = require('../../eslint-local-rules/index.js');

export default [
  {
    files: ['src/widgets/**/*.types.ts'],
    languageOptions: {
      parser: tsParser,
    },
    plugins: {
      'lifegames-local': lifegamesLocal,
    },
    rules: {
      'lifegames-local/widget-props-extends-schema': 'warn',  // W16: advisory only — see CLAUDE.md
    },
  },
  {
    files: ['src/**/*.{ts,tsx,js,jsx,css}'],
    plugins: {
      'lifegames-local': lifegamesLocal,
    },
    rules: {
      'lifegames-local/no-deprecated-tokens': 'warn',  // D4: warn on deprecated token refs
    },
  },
];

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
    // P3 presentational-purity: web DS widgets must not import data-fetch / app-state modules.
    // Advisory ('warn') for now — see GOVERNANCE.md §3, §5.
    files: ['src/widgets/**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      parser: tsParser,
    },
    plugins: {
      'lifegames-local': lifegamesLocal,
    },
    rules: {
      'lifegames-local/no-app-module-imports': 'warn',  // P3: advisory only
    },
  },
  {
    // D4: deprecated token refs in JS/TS source (incl. CSS-in-JS template literals).
    // tsParser handles both .ts/.tsx and plain .js/.jsx. Raw .css files are not
    // linted here (espree/tsParser cannot parse CSS); CSS token usage is covered
    // by the token build/validate pipeline, not ESLint.
    files: ['src/**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      parser: tsParser,
    },
    plugins: {
      'lifegames-local': lifegamesLocal,
    },
    rules: {
      'lifegames-local/no-deprecated-tokens': 'warn',  // D4: warn on deprecated token refs
    },
  },
];

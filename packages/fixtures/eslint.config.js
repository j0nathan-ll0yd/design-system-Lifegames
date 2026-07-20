import tsParser from '@typescript-eslint/parser'
import eslintConfigPrettier from 'eslint-config-prettier'

export default [
  {
    // Committed generated output (raw JSON + post-adapter JSON) is not linted;
    // node_modules excluded.
    ignores: ['node_modules/**', 'src/generated/**', 'src/post-adapter/*.json']
  },
  {files: ['src/**/*.{ts,tsx,js,jsx,mjs,cjs}', 'scripts/**/*.{ts,mjs}'], languageOptions: {parser: tsParser, ecmaVersion: 'latest', sourceType: 'module'}},
  eslintConfigPrettier
]

import tsParser from '@typescript-eslint/parser'
import eslintConfigPrettier from 'eslint-config-prettier'

export default [
  {ignores: ['dist/**', 'node_modules/**', 'generated/**']},
  {files: ['scripts/**/*.{ts,mjs}'], languageOptions: {parser: tsParser, ecmaVersion: 'latest', sourceType: 'module'}},
  eslintConfigPrettier
]

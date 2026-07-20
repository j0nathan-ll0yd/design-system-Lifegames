import tsParser from '@typescript-eslint/parser'
import {createRequire} from 'module'
import eslintConfigPrettier from 'eslint-config-prettier'

const require = createRequire(import.meta.url)
const lifegamesLocal = require('../../eslint-local-rules/index.js')

export default [
  {
    // D9 / GOVERNANCE P3.1 — the copy source tree must stay a zero-dependency
    // content leaf. Generated output (dist/) and the build script (scripts/) are
    // out of scope: dist is generated, and scripts/ is the only place allowed to
    // import the build-time schema devDep.
    ignores: ['dist/**', 'node_modules/**']
  },
  {
    files: ['src/**/*.{ts,tsx,js,jsx,mjs,cjs}'],
    languageOptions: {parser: tsParser, ecmaVersion: 'latest', sourceType: 'module'},
    plugins: {'lifegames-local': lifegamesLocal},
    rules: {'lifegames-local/copy-src-no-dependencies': 'error'}
  },
  eslintConfigPrettier
]

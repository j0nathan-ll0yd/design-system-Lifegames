import tsParser from '@typescript-eslint/parser'
import astroParser from 'astro-eslint-parser'
import astroPlugin from 'eslint-plugin-astro'
import {createRequire} from 'module'
import eslintConfigPrettier from 'eslint-config-prettier'

const require = createRequire(import.meta.url)
const lifegamesLocal = require('../../eslint-local-rules/index.js')
const cssTextParser = require('../../eslint-local-rules/css-text-parser.js')

export default [
  {
    files: ['src/widgets/**/*.types.ts'],
    languageOptions: {parser: tsParser},
    plugins: {'lifegames-local': lifegamesLocal},
    rules: {'lifegames-local/widget-props-extends-schema': 'error'}
  },
  {
    // P3 presentational-purity: web DS widgets must not import data-fetch / app-state modules.
    // BLOCKING ('error') — see GOVERNANCE.md §3, §5.
    files: ['src/widgets/**/*.{ts,tsx,js,jsx}'],
    languageOptions: {parser: tsParser},
    plugins: {'lifegames-local': lifegamesLocal},
    rules: {'lifegames-local/no-app-module-imports': 'error'}
  },
  {
    // D4: deprecated token refs in JS/TS source (incl. CSS-in-JS template literals).
    // tsParser handles both .ts/.tsx and plain .js/.jsx. Raw .css files are not
    // linted here (espree/tsParser cannot parse CSS); CSS token usage is covered
    // by the token build/validate pipeline, not ESLint.
    files: ['src/**/*.{ts,tsx,js,jsx}'],
    languageOptions: {parser: tsParser},
    plugins: {'lifegames-local': lifegamesLocal},
    rules: {
      'lifegames-local/no-deprecated-tokens': 'warn' // D4: warn on deprecated token refs
    }
  },
  // P1 — no raw hex in widgets: TS/JS variant.
  {
    files: ['src/widgets/**/*.{ts,tsx,js,jsx}'],
    languageOptions: {parser: tsParser},
    plugins: {'lifegames-local': lifegamesLocal},
    rules: {
      'lifegames-local/no-raw-hex-in-widgets': 'error' // P1: token-as-truth boundary
    }
  },
  // P1 — no raw hex in widgets: .astro variant. astro-eslint-parser exposes
  // the embedded <style> block as part of the Program source text, so the
  // rule's Program-level scan reaches CSS-in-Astro hex literals.
  //
  // P3 rides the same block: astro-eslint-parser exposes the `---` frontmatter
  // as real ESTree nodes, so ImportDeclaration and module-scope fetch() in an
  // .astro widget are reached by the same visitors as in a .ts module.
  ...astroPlugin.configs['flat/base'],
  {
    files: ['src/widgets/**/*.astro'],
    languageOptions: {parser: astroParser},
    plugins: {'lifegames-local': lifegamesLocal},
    rules: {'lifegames-local/no-raw-hex-in-widgets': 'error', 'lifegames-local/no-app-module-imports': 'error'}
  },
  // P1 — no raw hex in widgets: standalone .css variant. The rule's FILE_PATTERN
  // has always admitted .css and its Program handler scans raw source text, but
  // ESLint never handed it a .css file, so a hex literal in a widget stylesheet
  // was unreported. cssTextParser supplies an empty Program carrying the source
  // text, which is exactly what the raw-text scan needs. Scoped to src/**/*.css
  // rather than the widget tree so no stylesheet reaches the CLI without a
  // matching config (which --max-warnings 0 would otherwise fail on); the rule's
  // own FILE_PATTERN is what confines the diagnostic to widgets.
  {
    files: ['src/**/*.css'],
    languageOptions: {parser: cssTextParser},
    plugins: {'lifegames-local': lifegamesLocal},
    rules: {'lifegames-local/no-raw-hex-in-widgets': 'error'}
  },
  eslintConfigPrettier
]

// @j0nathan-ll0yd/config — shared flat-config factory for the Lifegames estate.
//
// Formatting is owned entirely by dprint (see ./dprint.json). This config
// enables NO stylistic/formatting rules — dprint and ESLint never fight.
//
// Core: `eslint:recommended` + `@typescript-eslint` recommended (NON type-checked,
// so it is safe for repos without a `tsconfig` project graph).
//
// Type-aware rules (`no-floating-promises`, `no-misused-promises`) require full
// type information and are therefore OPT-IN: pass `tsconfigRootDir` to
// `createBaseConfig(...)` to enable `parserOptions.projectService` and the block.
//
// This base is intentionally estate-neutral: no mantle-domain plugins/rules
// (no eslint-plugin-drizzle, no powertools/migrations/env local rules). It is
// safe for a portfolio site, a governance repo, or an orchestration scaffold.

import eslintJs from '@eslint/js'
import tseslint from 'typescript-eslint'

/**
 * Build the estate-standard flat-config array.
 *
 * @param {object} [options]
 * @param {string} [options.tsconfigRootDir] - When provided, enables type-aware
 *   linting via `parserOptions.projectService` rooted at this directory and turns
 *   on the promise-safety rules. Omit for a fast, type-info-free lint.
 * @returns {import('eslint').Linter.Config[]} flat-config array
 */
export function createBaseConfig(options = {}) {
  const {tsconfigRootDir} = options

  /** @type {import('eslint').Linter.Config[]} */
  const config = [
    eslintJs.configs.recommended,
    ...tseslint.configs.recommended,
    {
      // Defensive: assert formatting ownership. dprint owns all whitespace,
      // quotes, semicolons, and trailing commas — these must never be ESLint rules.
      rules: {quotes: 'off', semi: 'off', indent: 'off', 'comma-dangle': 'off'}
    }
  ]

  if (tsconfigRootDir) {
    config.push({
      languageOptions: {parserOptions: {projectService: true, tsconfigRootDir}},
      rules: {'@typescript-eslint/no-floating-promises': 'error', '@typescript-eslint/no-misused-promises': 'error'}
    })
  }

  return config
}

export default createBaseConfig

'use strict'

// P3 — Presentational-purity boundary (GOVERNANCE.md §3, §5).
//
// Web DS widgets (packages/web/src/widgets/**) must be pure functions of their
// props: data in, events out. They must NOT import data-fetching or app/state
// modules. This rule flags any import whose source resembles an app data layer.
//
// The forbidden list is intentionally CONSERVATIVE and documented — it targets
// import *sources* (module specifiers), not arbitrary identifiers, to avoid
// false positives on legitimate presentational helpers (e.g. ../../runtime/*
// pure formatters). Network calls made in module scope (`fetch(...)`) are also
// flagged, since a presentational widget must not fetch.

// `.astro` is included: astro-eslint-parser exposes the frontmatter script as
// real ESTree nodes, so an `import` or a module-scope `fetch(...)` in a widget's
// `---` block is reached by the same visitors as a `.ts` module. Leaving it out
// meant an `.astro` widget could import the app data layer and fetch at module
// scope with no diagnostic at all.
const FILE_PATTERN = /\/packages\/web\/src\/widgets\/.+\.(?:astro|ts|tsx|js|jsx|mjs|cjs)$/

// Forbidden import-source fragments. An import is flagged if its specifier
// CONTAINS any of these substrings (case-insensitive). Kept small + explicit.
const FORBIDDEN_SOURCE_FRAGMENTS = [
  '@j0nathan-ll0yd/web/data', // app data layer
  '/lib/api', // local api client
  '/api/', // api modules
  'apiclient', // APIClient-style modules
  '/stores/', // app state stores
  '/store/', // app state store
  '/services/', // service layer / data fetching
  'axios', // http client
  'swr', // data-fetching hook lib
  '@tanstack/query', // data-fetching hook lib
  'react-query' // data-fetching hook lib
]

module.exports = {
  meta: {
    type: 'problem',
    docs: {description: 'P3: web DS widgets must not import data-fetching / app-state modules (presentational-purity boundary)'},
    messages: {
      forbiddenImport:
        "P3: '{{source}}' looks like a data-fetching / app-state module. DS widgets must be presentational (data in, events out). Move the data dependency to the consuming app.",
      moduleScopeFetch: 'P3: module-scope fetch() in a DS widget violates the presentational-purity boundary. Pass data in via props instead.'
    },
    schema: []
  },
  create(context) {
    const filename = context.filename || context.getFilename()
    if (!FILE_PATTERN.test(filename)) {
      return {}
    }

    function isForbiddenSource(source) {
      const lower = String(source).toLowerCase()
      return FORBIDDEN_SOURCE_FRAGMENTS.some((frag) => lower.includes(frag))
    }

    return {
      ImportDeclaration(node) {
        const source = node.source && node.source.value
        if (typeof source === 'string' && isForbiddenSource(source)) {
          context.report({node: node.source, messageId: 'forbiddenImport', data: {source}})
        }
      },
      // `const x = require('...')` style (CJS) — flag forbidden sources too.
      CallExpression(node) {
        if (
          node.callee &&
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          node.arguments.length === 1 &&
          node.arguments[0].type === 'Literal' &&
          typeof node.arguments[0].value === 'string' &&
          isForbiddenSource(node.arguments[0].value)
        ) {
          context.report({node: node.arguments[0], messageId: 'forbiddenImport', data: {source: node.arguments[0].value}})
        }
        // Module-scope fetch(...) — only flag when not nested inside a function.
        if (node.callee && node.callee.type === 'Identifier' && node.callee.name === 'fetch') {
          let ancestor = node.parent
          let insideFunction = false
          while (ancestor) {
            if (
              ancestor.type === 'FunctionDeclaration' || ancestor.type === 'FunctionExpression' || ancestor.type === 'ArrowFunctionExpression'
            ) {
              insideFunction = true
              break
            }
            ancestor = ancestor.parent
          }
          if (!insideFunction) {
            context.report({node, messageId: 'moduleScopeFetch'})
          }
        }
      }
    }
  }
}

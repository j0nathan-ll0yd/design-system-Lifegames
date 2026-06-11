'use strict';

// D9 — @lifegames/copy leaf boundary (GOVERNANCE P3.1).
//
// packages/copy/src/** MUST remain a ZERO-dependency content leaf so the backend
// (an AWS Lambda) can import the copy package without pulling in any UI/DS code.
// It therefore must NOT import:
//   - any @lifegames/* package (tokens, web, schemas, …) — that would couple copy
//     to UI/DS packages and break the leaf guarantee;
//   - any UI framework (react, vue, svelte, astro, …).
//
// The JSON Schema is a BUILD-time devDependency and may be imported ONLY from
// packages/copy/scripts/** (the build). It must never be imported from src/.
//
// This is the highest-tier enforcement of the zero-runtime-dep boundary (B10):
// a lint rule, not a doc convention.

const SRC_FILE_PATTERN = /\/packages\/copy\/src\/.+\.(?:ts|tsx|js|jsx|mjs|cjs)$/;

// An import is forbidden if its specifier starts with any of these prefixes.
const FORBIDDEN_PREFIXES = [
  '@lifegames/', // any DS/UI package — copy must stay a leaf
  '@astrojs/',
];

// …or matches one of these UI-framework specifiers exactly.
const FORBIDDEN_EXACT = new Set([
  'react',
  'react-dom',
  'preact',
  'vue',
  'svelte',
  'solid-js',
  'astro',
  'lit',
]);

function isForbidden(source) {
  const s = String(source);
  if (FORBIDDEN_EXACT.has(s)) return true;
  return FORBIDDEN_PREFIXES.some((prefix) => s.startsWith(prefix));
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'D9 / P3.1: packages/copy/src must be a zero-dependency content leaf — no @lifegames/* or UI-framework imports (schema is a build-time devDep, importable only from scripts/).',
    },
    messages: {
      forbiddenImport:
        "D9: packages/copy/src must be a zero-dependency content leaf. '{{source}}' is forbidden here so the backend can import @lifegames/copy without pulling in UI/DS code. The JSON Schema is a build-time devDep importable only from packages/copy/scripts/. (GOVERNANCE P3.1)",
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename || context.getFilename();
    if (!SRC_FILE_PATTERN.test(filename)) {
      return {};
    }

    function check(node, source) {
      if (typeof source === 'string' && isForbidden(source)) {
        context.report({ node, messageId: 'forbiddenImport', data: { source } });
      }
    }

    return {
      ImportDeclaration(node) {
        if (node.source) check(node.source, node.source.value);
      },
      ExportNamedDeclaration(node) {
        if (node.source) check(node.source, node.source.value);
      },
      ExportAllDeclaration(node) {
        if (node.source) check(node.source, node.source.value);
      },
      // `require('…')` and dynamic `import('…')`
      CallExpression(node) {
        const callee = node.callee;
        const isRequire = callee && callee.type === 'Identifier' && callee.name === 'require';
        const isDynamicImport = callee && callee.type === 'Import';
        if (
          (isRequire || isDynamicImport) &&
          node.arguments.length === 1 &&
          node.arguments[0].type === 'Literal' &&
          typeof node.arguments[0].value === 'string'
        ) {
          check(node.arguments[0], node.arguments[0].value);
        }
      },
    };
  },
};

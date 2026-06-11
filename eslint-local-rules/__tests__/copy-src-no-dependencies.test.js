'use strict';

const { RuleTester } = require('eslint');

const rule = require('../copy-src-no-dependencies');

// A synthetic filename inside packages/copy/src/** so the rule activates.
const srcFile = '/repo/packages/copy/src/helpers.ts';
// scripts/ is the only place allowed to import the build-time schema devDep —
// the rule must be inert there.
const scriptsFile = '/repo/packages/copy/scripts/build.ts';

const tester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

tester.run('copy-src-no-dependencies', rule, {
  valid: [
    // node builtins inside src — allowed (they don't break the leaf guarantee).
    { filename: srcFile, code: "import { readFileSync } from 'node:fs';" },
    // Relative import of generated data — allowed.
    { filename: srcFile, code: "import data from './identity.flat.json';" },
    // The schema import is allowed OUTSIDE src (e.g. scripts/build.ts).
    {
      filename: scriptsFile,
      code: "import schema from '@lifegames/schemas/authored/copy.identity.schema.json';",
    },
    // UI framework imported from scripts — rule inert outside src.
    { filename: scriptsFile, code: "import React from 'react';" },
  ],

  invalid: [
    // Any @lifegames/* package in src is forbidden.
    {
      filename: srcFile,
      code: "import { tokens } from '@lifegames/tokens';",
      errors: [{ messageId: 'forbiddenImport', data: { source: '@lifegames/tokens' } }],
    },
    // The schema must NOT be imported from src (build-time only).
    {
      filename: srcFile,
      code: "import schema from '@lifegames/schemas/authored/copy.identity.schema.json';",
      errors: [{ messageId: 'forbiddenImport' }],
    },
    // UI frameworks are forbidden in src.
    {
      filename: srcFile,
      code: "import React from 'react';",
      errors: [{ messageId: 'forbiddenImport', data: { source: 'react' } }],
    },
    // require() form.
    {
      filename: srcFile,
      code: "const web = require('@lifegames/web');",
      errors: [{ messageId: 'forbiddenImport', data: { source: '@lifegames/web' } }],
    },
    // re-export form.
    {
      filename: srcFile,
      code: "export { x } from '@lifegames/tokens';",
      errors: [{ messageId: 'forbiddenImport', data: { source: '@lifegames/tokens' } }],
    },
  ],
});

'use strict'

const {RuleTester} = require('eslint')

const rule = require('../copy-src-no-dependencies')

// A synthetic filename inside packages/copy/src/** so the rule activates.
const srcFile = '/repo/packages/copy/src/helpers.ts'
// scripts/ (the build) is outside the rule's scope — the rule must be inert there.
const scriptsFile = '/repo/packages/copy/scripts/build.ts'

const tester = new RuleTester({languageOptions: {ecmaVersion: 2022, sourceType: 'module'}})

tester.run('copy-src-no-dependencies', rule, {
  valid: [
    // node builtins inside src — allowed (they don't break the leaf guarantee).
    {filename: srcFile, code: "import { readFileSync } from 'node:fs';"},
    // Relative import of generated data — allowed.
    {filename: srcFile, code: "import data from './identity.flat.json';"},
    // @j0nathan-ll0yd/* is allowed OUTSIDE src (the rule is scoped to src/ only).
    {filename: scriptsFile, code: "import { z } from '@j0nathan-ll0yd/schemas';"},
    // UI framework imported from scripts — rule inert outside src.
    {filename: scriptsFile, code: "import React from 'react';"}
  ],

  invalid: [
    // Any @j0nathan-ll0yd/* package in src is forbidden.
    {
      filename: srcFile,
      code: "import { tokens } from '@j0nathan-ll0yd/tokens';",
      errors: [{messageId: 'forbiddenImport', data: {source: '@j0nathan-ll0yd/tokens'}}]
    },
    // Any @j0nathan-ll0yd/* package in src is forbidden (here: schemas).
    {
      filename: srcFile,
      code: "import { z } from '@j0nathan-ll0yd/schemas';",
      errors: [{messageId: 'forbiddenImport', data: {source: '@j0nathan-ll0yd/schemas'}}]
    },
    // UI frameworks are forbidden in src.
    {filename: srcFile, code: "import React from 'react';", errors: [{messageId: 'forbiddenImport', data: {source: 'react'}}]},
    // require() form.
    {
      filename: srcFile,
      code: "const web = require('@j0nathan-ll0yd/web');",
      errors: [{messageId: 'forbiddenImport', data: {source: '@j0nathan-ll0yd/web'}}]
    },
    // re-export form.
    {
      filename: srcFile,
      code: "export { x } from '@j0nathan-ll0yd/tokens';",
      errors: [{messageId: 'forbiddenImport', data: {source: '@j0nathan-ll0yd/tokens'}}]
    }
  ]
})

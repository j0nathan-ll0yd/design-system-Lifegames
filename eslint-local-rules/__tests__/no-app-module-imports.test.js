'use strict'

const {RuleTester} = require('eslint')

const rule = require('../no-app-module-imports')

// A synthetic filename inside packages/web/src/widgets/** so the rule activates.
const widgetFile = '/repo/packages/web/src/widgets/health/HeartRate.ts'
// A file outside the widgets tree — rule must be inert.
const outsideFile = '/repo/packages/web/src/runtime/heart-rate.ts'

const tester = new RuleTester({languageOptions: {ecmaVersion: 2022, sourceType: 'module'}})

tester.run('no-app-module-imports', rule, {
  valid: [
    // Pure presentational helper import — allowed.
    {filename: widgetFile, code: "import { classifyHeartRate } from '../../runtime/heart-rate';"},
    // Token import — allowed.
    {filename: widgetFile, code: "import { tokens } from '@j0nathan-ll0yd/tokens';"},
    // fetch() inside a function body — allowed (only module-scope fetch is flagged).
    {filename: widgetFile, code: 'function load() { return fetch("/x"); }'},
    // Forbidden source but OUTSIDE the widgets tree — rule inert.
    {filename: outsideFile, code: "import client from '@j0nathan-ll0yd/web/data';"}
  ],

  invalid: [
    // App data layer import.
    {
      filename: widgetFile,
      code: "import client from '@j0nathan-ll0yd/web/data';",
      errors: [{messageId: 'forbiddenImport', data: {source: '@j0nathan-ll0yd/web/data'}}]
    },
    // Local api client.
    {filename: widgetFile, code: "import { get } from '../../lib/api';", errors: [{messageId: 'forbiddenImport', data: {source: '../../lib/api'}}]},
    // Store import.
    {
      filename: widgetFile,
      code: "import { useStore } from '../../stores/health';",
      errors: [{messageId: 'forbiddenImport', data: {source: '../../stores/health'}}]
    },
    // Third-party http client.
    {filename: widgetFile, code: "import axios from 'axios';", errors: [{messageId: 'forbiddenImport', data: {source: 'axios'}}]},
    // Module-scope fetch.
    {filename: widgetFile, code: 'const data = fetch("/api/health");', errors: [{messageId: 'moduleScopeFetch'}]}
  ]
})

console.log('no-app-module-imports: all tests passed')

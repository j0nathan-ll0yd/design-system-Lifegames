'use strict';

const { RuleTester } = require('eslint');
const tsParser = require('@typescript-eslint/parser');

const rule = require('../widget-props-extends-schema');

// A synthetic .types.ts file inside the widgets tree — rule activates here.
const widgetTypesFile = '/repo/packages/web/src/widgets/health/HeartRate.types.ts';
// A file outside the widgets tree — rule must be inert.
const outsideFile = '/repo/packages/web/src/widgets/health/HeartRate.ts';
// A non-types file that also shouldn't match.
const nonTypesFile = '/repo/packages/web/src/runtime/heart-rate.ts';

const tester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module', parser: tsParser },
});

tester.run('widget-props-extends-schema', rule, {
  valid: [
    // Props type imports from @lifegames/schemas — valid.
    {
      filename: widgetTypesFile,
      code: [
        "import type { HeartRateSchema } from '@lifegames/schemas';",
        'export interface HeartRateProps extends HeartRateSchema {}',
      ].join('\n'),
    },
    // Multiple imports including @lifegames/schemas — valid.
    {
      filename: widgetTypesFile,
      code: [
        "import type { HeartRateSchema } from '@lifegames/schemas';",
        "import type { SomeOther } from './other';",
        'export type HeartRateProps = HeartRateSchema & { extra: string };',
      ].join('\n'),
    },
    // schema-exempt comment — rule skips file entirely.
    {
      filename: widgetTypesFile,
      code: [
        '// schema-exempt: no schema defined yet for this widget',
        'export interface HeartRateProps { value: number; }',
      ].join('\n'),
    },
    // File outside the widgets types tree — rule is inert.
    {
      filename: outsideFile,
      code: 'export interface HeartRateProps { value: number; }',
    },
    // Completely unrelated file — rule is inert.
    {
      filename: nonTypesFile,
      code: 'export function foo() {}',
    },
  ],

  invalid: [
    // Props type missing schema import — must report.
    {
      filename: widgetTypesFile,
      code: 'export interface HeartRateProps { value: number; }',
      errors: [{ messageId: 'missingSchema' }],
    },
    // Imports from other packages but not @lifegames/schemas — must report.
    {
      filename: widgetTypesFile,
      code: [
        "import type { SomeType } from '@lifegames/tokens';",
        'export type HeartRateProps = { value: number };',
      ].join('\n'),
      errors: [{ messageId: 'missingSchema' }],
    },
    // Empty file with only a type alias and no schema import — must report.
    {
      filename: widgetTypesFile,
      code: 'export type HeartRateProps = Record<string, unknown>;',
      errors: [{ messageId: 'missingSchema' }],
    },
  ],
});

console.log('widget-props-extends-schema: all tests passed');

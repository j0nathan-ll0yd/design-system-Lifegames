'use strict';

// F-008 — End-to-end characterization test for the deprecation pipeline.
//
// This complements __tests__/no-deprecated-tokens.test.js (which exercises
// the rule's AST traversal in isolation) by exercising the FULL contract
// the rule has with the token build pipeline:
//
//   1. style-dictionary build emits packages/tokens/dist/deprecated-tokens.json
//      (an array of { cssVar, swiftName, replacement } records).
//   2. The ESLint rule walks up from each linted file until it finds that
//      JSON, parses it, and flags any reference to a listed cssVar /
//      swiftName in string Literals and TemplateLiteral quasis.
//
// We construct a temporary project tree that mirrors the real layout
// (packages/tokens/dist/deprecated-tokens.json + a synthetic widget file
// under packages/web/src/widgets/), then run the rule via RuleTester whose
// filename points into that tree. Four cases:
//
//   a) Widget that references a deprecated CSS var → flagged.
//   b) Widget that references a deprecated Swift accessor → flagged.
//   c) Widget that references the REPLACEMENT (non-deprecated) var → clean.
//   d) Empty deprecated-tokens.json → rule silent on the same input.
//
// (d) is implemented in a second RuleTester run with a fresh tmp tree
// and a fresh rule (cleared from the module cache) so its in-memory
// _deprecatedTokens cache reloads from the empty fixture.

const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { RuleTester } = require('eslint');

const ruleKey = require.resolve('../no-deprecated-tokens');

function freshRule() {
  delete require.cache[ruleKey];
  return require('../no-deprecated-tokens');
}

function buildTmpProject(deprecatedRecords) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lg-d4-spec-'));
  fs.mkdirSync(path.join(root, 'packages/tokens/dist'), { recursive: true });
  fs.mkdirSync(path.join(root, 'packages/web/src/widgets/foo'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'packages/tokens/dist/deprecated-tokens.json'),
    JSON.stringify(deprecatedRecords),
  );
  return root;
}

const tester = new RuleTester({
  languageOptions: { ecmaVersion: 2020, sourceType: 'module' },
});

// ── populated pipeline: one deprecated record ──────────────────────────────────
{
  const root = buildTmpProject([
    {
      cssVar: '--lg-color-legacy-pink',
      swiftName: 'Color.legacyPink',
      replacement: '--lg-color-accent-pink',
    },
  ]);
  const widgetFile = path.join(root, 'packages/web/src/widgets/foo/Foo.ts');
  const rule = freshRule();

  tester.run('no-deprecated-tokens [pipeline:populated]', rule, {
    valid: [
      // (c) reference to the REPLACEMENT var — must NOT be flagged
      {
        filename: widgetFile,
        code: 'const s = "color: var(--lg-color-accent-pink)";',
      },
    ],
    invalid: [
      // (a) reference to deprecated CSS var → flagged
      {
        filename: widgetFile,
        code: 'const s = "color: var(--lg-color-legacy-pink)";',
        errors: [{ messageId: 'deprecatedCssVar', data: { var: '--lg-color-legacy-pink' } }],
      },
      // (b) reference to deprecated Swift accessor → flagged
      {
        filename: widgetFile,
        code: 'const s = "LGColor.legacyPink";',
        errors: [{ messageId: 'deprecatedSwiftAccess', data: { name: 'Color.legacyPink' } }],
      },
    ],
  });

  fs.rmSync(root, { recursive: true, force: true });
}

// ── empty pipeline: deprecated-tokens.json is [] → rule silent ─────────────────
{
  const root = buildTmpProject([]);
  const widgetFile = path.join(root, 'packages/web/src/widgets/foo/Foo.ts');
  const rule = freshRule();

  tester.run('no-deprecated-tokens [pipeline:empty]', rule, {
    valid: [
      // (d) same input as (a) above — but the deprecated list is empty,
      // so the rule must NOT report.
      {
        filename: widgetFile,
        code: 'const s = "color: var(--lg-color-legacy-pink)";',
      },
    ],
    invalid: [],
  });

  fs.rmSync(root, { recursive: true, force: true });
}

console.log('no-deprecated-tokens.spec: all pipeline assertions passed');

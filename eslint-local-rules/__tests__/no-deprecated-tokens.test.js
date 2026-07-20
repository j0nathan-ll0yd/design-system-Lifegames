'use strict'

const path = require('path')
const fs = require('fs')
const os = require('os')
const assert = require('assert')
const {RuleTester} = require('eslint')

const rule = require('../no-deprecated-tokens')

// Build a temp project tree with a deprecated-tokens.json fixture
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'lg-d4-test-'))
const distDir = path.join(tmpRoot, 'packages', 'tokens', 'dist')
fs.mkdirSync(distDir, {recursive: true})

const deprecatedFixture = [
  {cssVar: '--lg-color-deprecated-one', swiftName: 'Color.deprecatedOne', replacement: '--lg-color-new-one'},
  {cssVar: '--lg-color-deprecated-two', swiftName: 'Color.deprecatedTwo', replacement: '--lg-color-new-two'}
]
fs.writeFileSync(path.join(distDir, 'deprecated-tokens.json'), JSON.stringify(deprecatedFixture))

// A synthetic filename that sits inside the temp project tree
const syntheticFile = path.join(tmpRoot, 'packages', 'web', 'src', 'widgets', 'Foo', 'Foo.ts')

// Reset the module-level cache between test runs by re-requiring with a fresh module cache
function freshRule() {
  // Delete cached module so _deprecatedTokens resets
  const ruleKey = require.resolve('../no-deprecated-tokens')
  delete require.cache[ruleKey]
  return require('../no-deprecated-tokens')
}

// Cleanup on exit
process.on('exit', () => {
  try {
    fs.rmSync(tmpRoot, {recursive: true, force: true})
  } catch (_) {}
})

// ─── RuleTester setup ──────────────────────────────────────────────────────────

const tester = new RuleTester({languageOptions: {ecmaVersion: 2020, sourceType: 'module'}})

const freshR = freshRule()

tester.run('no-deprecated-tokens', freshR, {
  valid: [
    // Non-deprecated CSS var — no warning
    {filename: syntheticFile, code: 'const s = "var(--lg-color-surface-base)";'},
    // Non-deprecated Swift accessor — no warning
    {filename: syntheticFile, code: 'const s = "LGColor.surfaceBase";'},
    // Template literal with non-deprecated var
    {filename: syntheticFile, code: 'const s = `color: var(--lg-color-text-title)`;'},
    // Empty string — no warning
    {filename: syntheticFile, code: 'const s = "";'},
    // File outside project tree — rule returns {} (no warns)
    {filename: '/tmp/outside-project/Foo.ts', code: 'const s = "var(--lg-color-deprecated-one)";'}
  ],

  invalid: [
    // Deprecated CSS var in string literal
    {
      filename: syntheticFile,
      code: 'const s = "var(--lg-color-deprecated-one)";',
      errors: [{messageId: 'deprecatedCssVar', data: {var: '--lg-color-deprecated-one'}}]
    },
    // Deprecated CSS var in template literal
    {
      filename: syntheticFile,
      code: 'const s = `color: var(--lg-color-deprecated-two)`;',
      errors: [{messageId: 'deprecatedCssVar', data: {var: '--lg-color-deprecated-two'}}]
    },
    // Deprecated Swift accessor via LGColor prefix
    {
      filename: syntheticFile,
      code: 'const s = "LGColor.deprecatedOne";',
      errors: [{messageId: 'deprecatedSwiftAccess', data: {name: 'Color.deprecatedOne'}}]
    },
    // Deprecated Swift accessor via Color prefix
    {filename: syntheticFile, code: 'const s = "Color.deprecatedTwo";', errors: [{messageId: 'deprecatedSwiftAccess', data: {name: 'Color.deprecatedTwo'}}]},
    // Two deprecated CSS vars in same string — two errors
    {
      filename: syntheticFile,
      code: 'const s = "var(--lg-color-deprecated-one) var(--lg-color-deprecated-two)";',
      errors: [
        {messageId: 'deprecatedCssVar', data: {var: '--lg-color-deprecated-one'}},
        {messageId: 'deprecatedCssVar', data: {var: '--lg-color-deprecated-two'}}
      ]
    },
    // Deprecated CSS var in template literal quasis
    {
      filename: syntheticFile,
      code: 'const x = 1; const s = `color: var(--lg-color-deprecated-one) ${x}`;',
      errors: [{messageId: 'deprecatedCssVar', data: {var: '--lg-color-deprecated-one'}}]
    }
  ]
})

console.log('no-deprecated-tokens: all tests passed')

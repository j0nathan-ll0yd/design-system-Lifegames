// Known-answer suite for the web widget-purity lint CONFIGURATION.
//
// The RuleTester suites under eslint-local-rules/__tests__/ prove each rule
// reports what it should. They cannot prove the rule is WIRED to block: a
// RuleTester invalid-case passes identically whether the rule is configured
// 'warn' or 'error', and it never sees the file glob the CLI is invoked with.
//
// Both of those were broken, and neither was visible from a rule test:
//
//   - `widget-props-extends-schema` and `no-app-module-imports` were 'warn',
//     and `pnpm lint` carried no --max-warnings, so a widget importing axios
//     beside a .types.ts with no schema import produced
//     `2 problems (0 errors, 2 warnings)` and LINT EXIT=0.
//   - `no-raw-hex-in-widgets` declared `.css` in its FILE_PATTERN and scanned
//     raw source text, but the CLI glob was `{ts,tsx,js,jsx,astro}` and no
//     config block matched `.css`, so ESLint never handed it one.
//   - `no-app-module-imports` did not admit `.astro`, so an .astro widget could
//     import a data layer and call fetch() at module scope with no diagnostic.
//
// So this suite asserts the two things a rule test structurally cannot: the
// resolved SEVERITY of each diagnostic through the real eslint.config.js, and
// that the `lint` script's glob and --max-warnings still carry every extension
// those rules claim. A regression to 'warn', a dropped extension, or a dropped
// --max-warnings reds here.

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import {ESLint} from 'eslint'

const ROOT = path.resolve(import.meta.dirname, '..', '..')
const WEB = path.join(ROOT, 'packages/web')
const WIDGETS = path.join(WEB, 'src/widgets')

// `lintText` resolves config from filePath without the file existing on disk,
// so these probes never touch the real widget tree.
const eslint = new ESLint({cwd: WEB, overrideConfigFile: path.join(WEB, 'eslint.config.js')})

async function lint(relPath, code) {
  const [result] = await eslint.lintText(code, {filePath: path.join(WIDGETS, relPath)})
  return result.messages
}

/** Every message for `ruleId`, asserting at least one and that all are errors (severity 2). */
function blockingMessages(messages, ruleId) {
  const hits = messages.filter((m) => m.ruleId === ruleId)
  assert.ok(hits.length > 0, `expected at least one ${ruleId} diagnostic, got: ${JSON.stringify(messages)}`)
  for (const hit of hits) {
    assert.equal(hit.severity, 2, `${ruleId} must be configured 'error' (severity 2), got severity ${hit.severity}. A warning cannot fail the build.`)
  }
  return hits
}

// covers: widget-contract#A web widget module imports no data layer and performs no module-scope fetch
test('P3 forbidden import in a .ts widget blocks', async () => {
  const messages = await lint('other/__probe.ts', "import axios from 'axios'\nexport const x = axios\n")
  blockingMessages(messages, 'lifegames-local/no-app-module-imports')
})

// covers: widget-contract#A web widget module imports no data layer and performs no module-scope fetch
test('P3 reaches .astro frontmatter: forbidden import and module-scope fetch both block', async () => {
  const messages = await lint('other/__Probe.astro',
    "---\nimport axios from 'axios'\nconst data = await fetch('https://example.com/api')\n---\n\n<div>{String(data)}{String(axios)}</div>\n")
  const hits = blockingMessages(messages, 'lifegames-local/no-app-module-imports')
  const ids = hits.map((h) => h.messageId).sort()
  assert.deepEqual(ids, ['forbiddenImport', 'moduleScopeFetch'], `expected both .astro P3 diagnostics, got ${JSON.stringify(ids)}`)
})

// covers: widget-contract#A web widget module imports no data layer and performs no module-scope fetch
test('P3 stays inert on a presentational helper import', async () => {
  const messages = await lint('other/__probe.ts', "import {format} from '../../runtime/format'\nexport const x = format\n")
  assert.deepEqual(messages.filter((m) => m.ruleId === 'lifegames-local/no-app-module-imports'), [])
})

// covers: widget-contract#A web widget source holds no raw hex outside a token fallback argument
test('P1 raw hex in a standalone .css widget stylesheet blocks', async () => {
  const messages = await lint('identity/__probe.css', '.probe {\n  color: #ff006e;\n}\n')
  blockingMessages(messages, 'lifegames-local/no-raw-hex-in-widgets')
})

// covers: widget-contract#A web widget source holds no raw hex outside a token fallback argument
test('P1 allows a token reference with a hex fallback in .css', async () => {
  const messages = await lint('identity/__probe.css', '.probe {\n  color: var(--lg-color-accent-pink, #ff006e);\n}\n')
  assert.deepEqual(messages.filter((m) => m.ruleId === 'lifegames-local/no-raw-hex-in-widgets'), [])
})

// covers: widget-contract#A web widget Props type extends its generated schema unless marked schema-exempt
test('W16 missing schema import in a .types.ts blocks', async () => {
  const messages = await lint('other/__probe.types.ts', 'export interface ProbeProps {\n  label: string\n}\n')
  blockingMessages(messages, 'lifegames-local/widget-props-extends-schema')
})

test('the lint script scans every extension its rules claim, and fails on warnings', async () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(WEB, 'package.json'), 'utf-8'))
  const script = pkg.scripts.lint
  for (const ext of ['ts', 'tsx', 'js', 'jsx', 'astro', 'css']) {
    assert.ok(new RegExp(`[{,]${ext}[},]`).test(script),
      `packages/web "lint" must scan .${ext} — the rules declare it, so a missing extension is an unscanned corpus. Got: ${script}`)
  }
  assert.match(script, /--max-warnings\s+0/,
    `packages/web "lint" must carry --max-warnings 0, or a rule left at 'warn' exits 0 and cannot block. Got: ${script}`)
})

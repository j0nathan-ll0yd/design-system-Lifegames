import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {globSync, readdirSync, readFileSync} from 'node:fs'
import {dirname, resolve} from 'node:path'
import {test} from 'node:test'
import {fileURLToPath} from 'node:url'
import {parse as parseYaml} from 'yaml'

// Pins the CI shape that atlas decision 0168 items 2, 4 and 5 chose. Each assertion names a
// regression that every gate would otherwise miss: a trigger list or a cache input changes no
// check result, it only changes how many times and how slowly the checks run.

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const workflowsDir = resolve(repoRoot, '.github/workflows')
const load = (file) => parseYaml(readFileSync(resolve(workflowsDir, file), 'utf8'))

const ci = load('ci.yml')
const swiftSnapshots = load('swift-snapshots.yml')

// Branch protection on main requires these contexts. A renamed job leaves the required context
// pending forever, and a required job without a step of the same name breaks the A2b exact-step
// binding (atlas audits/gate-can-fail-campaign.md).
const REQUIRED = [
  ['ci.yml', ci, 'format'],
  ['ci.yml', ci, 'typecheck'],
  ['ci.yml', ci, 'governance-gates'],
  ['ci.yml', ci, 'contract-ts'],
  ['ci.yml', ci, 'test-swift'],
  ['ci.yml', ci, 'package-version-drift'],
  ['ci.yml', ci, 'web-browser-runtime'],
  ['swift-snapshots.yml', swiftSnapshots, 'swift-snapshots']
]

// The seven non-required install-only jobs, folded into two (decision 0168 item 4). Each old
// job name survives as a step name, so a red step still names its gate.
const FOLDED = {packages: ['schemas-freshness', 'copy', 'fixtures'], 'web-builds': ['lint-web', 'build-web', 'storybook-build', 'docs-build']}

const isSetupStep = (step) => typeof step.uses === 'string' || step.name === 'Authenticate to GitHub Packages' || /pnpm install/.test(step.run ?? '')

for (const [file, workflow] of [['ci.yml', ci], ['swift-snapshots.yml', swiftSnapshots]]) {
  test(`${file}: drafts run CI and the ready flip runs nothing (one run per sha)`, () => {
    // `opened` is what runs a draft; `ready_for_review` would re-run every check on the same sha.
    assert.deepEqual(workflow.on.pull_request.types, ['opened', 'synchronize', 'reopened'])
    for (const [id, job] of Object.entries(workflow.jobs)) {
      assert.doesNotMatch(String(job.if ?? ''), /\.draft\b/, `${file} job ${id} must not skip drafts`)
    }
  })
}

for (const [file, workflow, context] of REQUIRED) {
  test(`${file}: required context ${context} keeps its job name and its exact-step binding`, () => {
    const entry = Object.entries(workflow.jobs).find(([id, job]) => (job.name ?? id) === context)
    assert.ok(entry, `${file} has no job reporting the required context ${context}`)
    assert.ok(entry[1].steps.some((step) => step.name === context), `${file} job ${context} has no step named ${context}`)
  })
}

test('ci.yml: the folded jobs keep one named step per old gate, each run past an earlier red', () => {
  for (const [jobId, oldJobs] of Object.entries(FOLDED)) {
    const job = ci.jobs[jobId]
    assert.ok(job, `ci.yml has no ${jobId} job`)
    const namesGate = (name, oldJob) => name === oldJob || String(name).startsWith(`${oldJob}: `)
    for (const oldJob of oldJobs) {
      assert.ok(!(oldJob in ci.jobs), `${oldJob} must stay folded into ${jobId}, not return as its own job`)
      assert.ok(job.steps.some((step) => namesGate(step.name, oldJob)), `${jobId} has no step for ${oldJob}`)
    }
    for (const step of job.steps.filter((s) => !isSetupStep(s))) {
      assert.ok(oldJobs.some((oldJob) => namesGate(step.name, oldJob)), `${jobId} step "${step.name ?? step.run}" must be named for the gate it came from`)
      assert.match(String(step.if ?? ''), /!cancelled\(\)/, `${jobId} step "${step.name}" must run under !cancelled()`)
    }
  }
})

const governanceGatesLines = () => ci.jobs['governance-gates'].steps.find((s) => s.name === 'governance-gates').run.split('\n').map((line) => line.trim())

test('ci.yml: governance-gates runs both fixture-map validators', () => {
  // packages is not a required context, so these lines in packages alone could not block a merge.
  const pkgName = (dir) => JSON.parse(readFileSync(resolve(repoRoot, dir, 'package.json'), 'utf8')).name
  for (
    const command of [
      `LIFEGAMES_VALIDATE_CWD="$PWD" pnpm -F ${pkgName('packages/schemas')} validate`,
      `pnpm -F ${pkgName('packages/fixtures')} exec vitest run tests/validate.test.ts`
    ]
  ) {
    assert.ok(governanceGatesLines().includes(command), `governance-gates must run: ${command}`)
  }
})

// `pnpm test:scripts` is the one CI run of every node:test and RuleTester suite, and it runs in
// governance-gates, a required context. Before, 14 of these suites had their own line in that step,
// six more had a step in another job, and seven ran in no CI job at all: only .husky/pre-push ran
// them, and DS_SKIP_PREPUSH=1 skips the hook.
const TEST_SCRIPTS = 'pnpm test:scripts'
const testScriptsGlobs = () => {
  const [node, flag, ...globs] = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8')).scripts['test:scripts'].split(/\s+/)
  assert.deepEqual([node, flag], ['node', '--test'], 'test:scripts must stay a bare `node --test <globs>`')
  return globs
}
const coveredSuites = () => new Set(testScriptsGlobs().flatMap((glob) => globSync(glob, {cwd: repoRoot})))

// Every suite that had a pinned `node --test` line in ci.yml before the consolidation. The globs
// must still reach each one, so a narrowed glob cannot drop a suite that used to gate a merge.
const FORMERLY_PINNED = [
  'audits/__tests__/c147-package-drift.test.mjs',
  'audits/__tests__/c147-self-test-shard.test.mjs',
  'audits/__tests__/d3-contrast.test.mjs',
  'audits/__tests__/d3-openspec-covers.test.mjs',
  'audits/__tests__/d3-promotion.test.mjs',
  'audits/__tests__/d3-ssr-image-fallback.test.mjs',
  'audits/__tests__/d3-swift-widget-purity.test.mjs',
  'audits/__tests__/d3-token-parity.test.mjs',
  'audits/__tests__/d3-validate-dtcg.test.mjs',
  'audits/__tests__/d3-watch-exclusions.test.mjs',
  'audits/__tests__/d3-web-lint-severity.test.mjs',
  'contracts/component-catalog/ratchet.test.mjs',
  'eslint-local-rules/__tests__/copy-src-no-dependencies.test.js',
  'eslint-local-rules/__tests__/no-app-module-imports.test.js',
  'eslint-local-rules/__tests__/no-deprecated-tokens.test.js',
  'eslint-local-rules/__tests__/no-raw-hex-in-widgets.test.js',
  'eslint-local-rules/__tests__/widget-props-extends-schema.test.js',
  'packages/schemas/scripts/coffee-tracking-schema.test.mjs',
  'packages/schemas/scripts/contract-lock.test.mjs',
  'packages/schemas/scripts/fixture-wiring.test.mjs',
  'packages/schemas/scripts/schema-urn.test.mjs',
  'packages/schemas/scripts/validate.test.mjs',
  'scripts/ci-workflow-shape.test.mjs',
  'scripts/release-workflow.test.mjs',
  'scripts/storybook-visual-regression.test.mjs'
]

test('ci.yml: governance-gates runs `pnpm test:scripts`', () => {
  assert.ok(governanceGatesLines().includes(TEST_SCRIPTS), `governance-gates must run: ${TEST_SCRIPTS}`)
})

test('package.json: the test:scripts globs still reach every suite ci.yml used to pin', () => {
  const covered = coveredSuites()
  const dropped = FORMERLY_PINNED.filter((suite) => !covered.has(suite))
  assert.deepEqual(dropped, [], `test:scripts no longer runs: ${dropped.join(', ')}`)
})

test('package.json: the test:scripts globs reach every tracked node:test and RuleTester suite', () => {
  // A suite placed outside the globs runs nowhere in CI. vitest suites (*.test.ts, the package and
  // Tests/ trees) do not import node:test or RuleTester, so they fall outside this net.
  // A pre-push hook exports GIT_DIR, which outranks cwd; strip it so git reads this checkout.
  const gitFreeEnv = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith('GIT_')))
  const tracked = execFileSync('git', ['ls-files', '-z', '--', '*.test.mjs', '*.test.js', '*.test.cjs'], {cwd: repoRoot, encoding: 'utf8', env: gitFreeEnv})
    .split('\0').filter(Boolean)
  const suites = tracked.filter((file) =>
    /from ['"]node:test['"]|require\(['"]node:test['"]\)|\bRuleTester\b/.test(readFileSync(resolve(repoRoot, file), 'utf8'))
  )
  assert.ok(suites.length >= FORMERLY_PINNED.length, `found only ${suites.length} node:test suites; the discovery is broken`)
  const covered = coveredSuites()
  const orphaned = suites.filter((suite) => !covered.has(suite))
  assert.deepEqual(orphaned, [], `no CI job runs: ${orphaned.join(', ')}`)
})

test('ci.yml: no step runs a test:scripts suite a second time', () => {
  // `pnpm test:scripts` in governance-gates is the one CI run. A per-suite `node --test` line costs
  // wall clock and, outside a required context, reads as a gate that cannot block.
  const covered = coveredSuites()
  const twice = []
  for (const [id, job] of Object.entries(ci.jobs)) {
    for (const step of job.steps ?? []) {
      const commands = String(step.run ?? '').split('\n').map((line) => line.trim()).filter((line) => line && !line.startsWith('#'))
      for (const command of commands.filter((line) => /\bnode\s+--test\b/.test(line))) {
        const targets = command.split(/\s+/).slice(2).filter((arg) => !arg.startsWith('-')).flatMap((arg) => globSync(arg, {cwd: repoRoot}))
        twice.push(...targets.filter((suite) => covered.has(suite)).map((suite) => `${id}: ${suite}`))
      }
      if (commands.includes(TEST_SCRIPTS) && !(id === 'governance-gates' && step.name === 'governance-gates')) {
        twice.push(`${id}: ${TEST_SCRIPTS}`)
      }
    }
  }
  assert.deepEqual(twice, [], `run outside the governance-gates \`${TEST_SCRIPTS}\`: ${twice.join(', ')}`)
})

test('no workflow restores the pnpm store from the GitHub Actions cache', () => {
  for (const file of readdirSync(workflowsDir).filter((f) => f.endsWith('.yml'))) {
    for (const [id, job] of Object.entries(load(file).jobs)) {
      for (const step of job.steps ?? []) {
        if (!String(step.uses ?? '').startsWith('actions/setup-node@')) {
          continue
        }
        assert.ok(!('cache' in (step.with ?? {})), `${file} job ${id}: setup-node must not set \`cache\``)
      }
    }
  }
})

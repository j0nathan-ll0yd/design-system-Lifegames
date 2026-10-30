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

// GitHub counts a SKIPPED required job as satisfied. On 2026-10-27 build-tokens failed at PR #333's
// 005ed18, three required jobs skipped on their failed `needs:`, and the PR read mergeable. A
// required job therefore never skips: it runs past a failed or cancelled need and reds on it, and
// it refuses a fork PR with a red step instead of a job-level skip. Every guard runs before
// checkout, so a red costs no suite, and no guard may carry `continue-on-error`.
const FORK_PR = "github.event_name == 'pull_request' && github.event.pull_request.head.repo.full_name != github.repository"
// The exact job-level `if:` of a required job with one need. On a run cancel GitHub re-evaluates
// the `if:` of every running job and cancels it when the `if:` turns false, so a job whose need
// already succeeded stops and frees its runner. When the need failed or was cancelled, the second
// arm keeps the job running to red at its guard. A status function in the `if:` drops the implicit
// success(). Plain `!cancelled()` SKIPS the job when the run is cancelled during its need, and
// `always()` keeps a cancelled run's job running to completion.
const NEEDS_IF = (need) => `\${{ !cancelled() || needs.${need}.result != 'success' }}`
// The guard test on a need's result: red on anything but success, a cancelled need included.
const guardTest = (variable) => `[ "$${variable}" != 'success' ]`
// Named exceptions, pinned verbatim. package-version-drift has three needs, and its self-test
// rungs skip legitimately, so it runs on as long as any need failed or was cancelled.
// swift-snapshots skips only on a clean "no Swift change" answer and runs the full suite when
// swift-changes failed or skipped, so its guard reds only a cancelled run.
const EXCEPTIONS = {
  'package-version-drift': {if: "${{ !cancelled() || contains(needs.*.result, 'cancelled') || contains(needs.*.result, 'failure') }}"},
  'swift-snapshots': {
    if: "${{ needs.swift-changes.result != 'success' || (!cancelled() && needs.swift-changes.outputs.swift == 'true') }}",
    guardTest: (variable) => `[ "$${variable}" = 'cancelled' ]`
  }
}
// Needs a job aggregates itself, because they skip legitimately: package-version-drift requires its
// self-test rungs only when the drift engine changed, and reds on any outcome it does not recognise.
const AGGREGATED_NEEDS = {'package-version-drift': ['drift-self-test-baseline', 'drift-self-test-shard']}
const requiredJob = (workflow, context) => Object.entries(workflow.jobs).find(([id, job]) => (job.name ?? id) === context)?.[1]
const needsOf = (job) => [job.needs ?? []].flat()
const exits1 = (step) => /^\s*exit 1\s*$/m.test(step.run ?? '')

for (const [file, workflow, context] of REQUIRED) {
  test(`${file}: required context ${context} never passes by skipping on a failed or cancelled need or a fork PR`, () => {
    const job = requiredJob(workflow, context)
    assert.equal(job['continue-on-error'], undefined, `${context} must not carry job-level continue-on-error`)
    assert.doesNotMatch(String(job.if ?? ''), /head\.repo\.full_name/, `${context} must refuse a fork PR with a red step, not skip it with a job-level if`)

    const checkoutAt = job.steps.findIndex((step) => String(step.uses ?? '').startsWith('actions/checkout@'))
    assert.ok(checkoutAt > 0, `${context} must check out after its guards`)
    const guards = job.steps.slice(0, checkoutAt)
    for (const step of guards) {
      assert.equal(step['continue-on-error'], undefined, `${context}: guard "${step.name}" must not carry continue-on-error`)
    }

    assert.equal(guards[0].if, FORK_PR, `${context}: its first step must refuse a fork PR, before checkout`)
    assert.ok(exits1(guards[0]), `${context}: the fork refusal must exit 1`)

    if (needsOf(job).length === 0) {
      assert.equal(job.if, undefined, `${context} has no needs, so it must carry no job-level if that could skip it`)
      return
    }
    // A plain `if:` carries an implicit success(), which skips the job when a need fails.
    const pinnedIf = EXCEPTIONS[context]?.if ?? (needsOf(job).length === 1 ? NEEDS_IF(needsOf(job)[0]) : undefined)
    assert.ok(pinnedIf, `${context} has several needs, so it needs a pinned exception`)
    assert.equal(job.if, pinnedIf, `${context} needs ${needsOf(job)}, so its if must be exactly the pinned one`)

    for (const need of needsOf(job)) {
      const result = `\${{ needs.${need}.result }}`
      if (AGGREGATED_NEEDS[context]?.includes(need)) {
        assert.ok(guards.some((step) => Object.values(step.env ?? {}).includes(result)), `${context} must aggregate ${need} before checkout`)
        continue
      }
      const guard = guards.find((step) => Object.values(step.env ?? {}).includes(result))
      assert.ok(guard, `${context} needs ${need} but no step before checkout reads ${result}`)
      const variable = Object.entries(guard.env).find(([, value]) => value === result)[0]
      const test = (EXCEPTIONS[context]?.guardTest ?? guardTest)(variable)
      assert.ok(guard.run.includes(test), `${context}: the ${need} guard must test ${test}`)
      assert.ok(exits1(guard), `${context}: the ${need} guard must exit 1`)
      // The implicit success() skips the guard only after an earlier guard has already red.
      assert.equal(guard.if, undefined, `${context}: the ${need} guard must carry no if that could skip it`)
    }
  })
}

// The cancel-aware `if:` above is safe only while every upstream job is CANCELLED by a run cancel,
// so its result reads 'cancelled' and the dependent runs and reds at its guard. That holds only
// while no upstream `if:` carries a status function: the implicit success() is what cancels it.
// An upstream `always()` would finish success after the cancel, leave both arms of the dependent's
// `if:` false, and SKIP the required context. On build-tokens it would also drop the fork check
// and run fork code on self-hosted hardware. So every job in the needs chain of a required job is
// pinned verbatim. Each root (a job with no needs) carries the same-repo condition; a job below a
// root inherits it, because the implicit success() skips it when its root skipped on a fork.
const SAME_REPO = "github.event_name == 'push' || github.event.pull_request.head.repo.full_name == github.repository"
const UPSTREAM_IFS = {
  'ci.yml': {
    'build-tokens': SAME_REPO,
    'drift-engine-filter': SAME_REPO,
    'drift-self-test-baseline': "needs.drift-engine-filter.outputs.engine == 'true'",
    'drift-self-test-shard': "needs.drift-engine-filter.outputs.engine == 'true'"
  },
  'swift-snapshots.yml': {'swift-changes': `github.event_name != 'workflow_dispatch' && (${SAME_REPO})`}
}
const STATUS_FUNCTION = /\b(always|cancelled|failure|success)\s*\(/

for (const [file, workflow] of [['ci.yml', ci], ['swift-snapshots.yml', swiftSnapshots]]) {
  test(`${file}: every upstream job of a required context is pinned, carries no status function, and keeps the fork check`, () => {
    const pins = UPSTREAM_IFS[file]
    const reached = new Set()
    const walk = (id) => {
      for (const need of needsOf(workflow.jobs[id])) {
        if (reached.has(need)) {
          continue
        }
        reached.add(need)
        walk(need)
      }
    }
    for (const [, , context] of REQUIRED.filter(([f]) => f === file)) {
      walk(Object.keys(workflow.jobs).find((id) => (workflow.jobs[id].name ?? id) === context))
    }
    for (const id of reached) {
      const job = workflow.jobs[id]
      assert.ok(id in pins, `${file}: ${id} is upstream of a required context but has no pinned if`)
      assert.doesNotMatch(String(job.if ?? ''), STATUS_FUNCTION,
        `${file}: upstream job ${id} must carry no status function, or a cancel can leave it successful`)
      assert.equal(job.if, pins[id], `${file}: upstream job ${id} must keep its pinned if`)
      if (needsOf(job).length === 0) {
        assert.ok(String(job.if ?? '').includes(SAME_REPO), `${file}: upstream root ${id} must skip a fork PR with the same-repo condition`)
      }
    }
    for (const id of Object.keys(pins)) {
      assert.ok(reached.has(id), `${file}: pinned upstream job ${id} is upstream of no required context; prune the pin`)
    }
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
// The shape test pins its own run on a separate governance-gates line, BEFORE `pnpm test:scripts`.
// Inside test:scripts alone, deleting that line or narrowing its glob would also stop this guard,
// and nothing in CI would red. It is the one suite allowed to run twice.
const SHAPE_TEST = 'scripts/ci-workflow-shape.test.mjs'
const SHAPE_TEST_COMMAND = `node --test ${SHAPE_TEST}`
const testScriptsCommand = () => JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8')).scripts['test:scripts']
const testScriptsGlobs = () => {
  const [node, flag, ...globs] = testScriptsCommand().split(/\s+/)
  assert.deepEqual([node, flag], ['node', '--test'], 'test:scripts must stay a bare `node --test <globs>`')
  return globs
}
// A pre-push hook exports GIT_DIR, which outranks cwd; strip it so git reads this checkout.
const gitFreeEnv = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith('GIT_')))
const trackedFiles = (...patterns) =>
  execFileSync('git', ['ls-files', '-z', '--', ...patterns], {cwd: repoRoot, encoding: 'utf8', env: gitFreeEnv}).split('\0').filter(Boolean)
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

test('ci.yml: governance-gates runs the D6 full-tree personal-data scan', () => {
  // .husky/pre-commit scans staged files only, and audit-ds.yml runs weekly; a commit made without
  // hooks reaches main unscanned unless a required context scans the tree.
  const command = 'bash audits/checks/d6-scan-personal-data.sh --full-tree'
  assert.ok(governanceGatesLines().includes(command), `governance-gates must run: ${command}`)
})

test('ci.yml: governance-gates runs `pnpm test:scripts`', () => {
  assert.ok(governanceGatesLines().includes(TEST_SCRIPTS), `governance-gates must run: ${TEST_SCRIPTS}`)
})

test('ci.yml: governance-gates runs the shape test on its own line, before `pnpm test:scripts`', () => {
  const lines = governanceGatesLines()
  const own = lines.indexOf(SHAPE_TEST_COMMAND)
  assert.ok(own >= 0, `governance-gates must run: ${SHAPE_TEST_COMMAND}`)
  assert.ok(own < lines.indexOf(TEST_SCRIPTS), `${SHAPE_TEST_COMMAND} must run before ${TEST_SCRIPTS}`)
})

test('package.json: test:scripts is one plain command, and every glob matches a tracked file', () => {
  // `|| true` or `; true` would keep the globs below intact and make the run pass regardless. An
  // empty glob makes node --test run 0 tests from it and still exit 0.
  const tokens = testScriptsCommand().split(/\s+/)
  const shell = tokens.filter((token) => /[|;&<>`$]/.test(token))
  assert.deepEqual(shell, [], `test:scripts must hold no shell operator: ${shell.join(' ')}`)
  const tracked = new Set(trackedFiles())
  const empty = testScriptsGlobs().filter((glob) => !globSync(glob, {cwd: repoRoot}).some((file) => tracked.has(file)))
  assert.deepEqual(empty, [], `test:scripts globs that match no tracked file: ${empty.join(' ')}`)
})

test('package.json: the test:scripts globs still reach every suite ci.yml used to pin', () => {
  const covered = coveredSuites()
  const dropped = FORMERLY_PINNED.filter((suite) => !covered.has(suite))
  assert.deepEqual(dropped, [], `test:scripts no longer runs: ${dropped.join(', ')}`)
})

test('package.json: the test:scripts globs reach every tracked node:test and RuleTester suite', () => {
  // A suite placed outside the globs runs nowhere in CI. vitest suites (*.test.ts, the package and
  // Tests/ trees) do not import node:test or RuleTester, so they fall outside this net.
  // *.spec.* is in the net too: a RuleTester file named no-deprecated-tokens.spec.js ran nowhere.
  const tracked = trackedFiles('*.test.mjs', '*.test.js', '*.test.cjs', '*.spec.mjs', '*.spec.js', '*.spec.cjs')
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
  // wall clock and, outside a required context, reads as a gate that cannot block. The one
  // exemption is the shape test's own pinned line in governance-gates (see SHAPE_TEST above).
  // Limit: the check reads one trimmed line at a time and expects `node --test` as adjacent words,
  // so a `\` continuation or a flag between them (`node --import ./x.mjs --test <file>`) slips past.
  // A missed duplicate costs wall clock, not coverage: the run-everywhere checks above still hold.
  const covered = coveredSuites()
  const twice = []
  for (const [id, job] of Object.entries(ci.jobs)) {
    for (const step of job.steps ?? []) {
      const commands = String(step.run ?? '').split('\n').map((line) => line.trim()).filter((line) => line && !line.startsWith('#'))
      const pinnedShapeTest = (line) => id === 'governance-gates' && step.name === 'governance-gates' && line === SHAPE_TEST_COMMAND
      for (const command of commands.filter((line) => /\bnode\s+--test\b/.test(line) && !pinnedShapeTest(line))) {
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

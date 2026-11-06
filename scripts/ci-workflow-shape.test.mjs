import assert from 'node:assert/strict'
import {execFileSync, spawnSync} from 'node:child_process'
import {existsSync, globSync, readdirSync, readFileSync} from 'node:fs'
import {dirname, relative, resolve} from 'node:path'
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
  // Owner decision 2026-10-30: the folded copy, fixtures and schemas gates block a merge.
  ['ci.yml', ci, 'packages'],
  ['swift-snapshots.yml', swiftSnapshots, 'swift-snapshots']
]

// The seven install-only jobs, folded into two (decision 0168 item 4). Each old job name survives
// as a step name, so a red step still names its gate. None was a required context at the fold;
// `packages` became one by owner decision 2026-10-30, and `web-builds` is still not one.
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

const namesGate = (name, oldJob) => name === oldJob || String(name).startsWith(`${oldJob}: `)
// A required folded job also carries its fork refusal and its exact-step verdict, which name no gate.
const isRequiredJobFrame = (jobId, step) =>
  REQUIRED.some(([file, , context]) => file === 'ci.yml' && context === jobId) && (step.if === FORK_PR || step.name === jobId)

test('ci.yml: the folded jobs keep one named step per old gate, each run past an earlier red', () => {
  for (const [jobId, oldJobs] of Object.entries(FOLDED)) {
    const job = ci.jobs[jobId]
    assert.ok(job, `ci.yml has no ${jobId} job`)
    for (const oldJob of oldJobs) {
      assert.ok(!(oldJob in ci.jobs), `${oldJob} must stay folded into ${jobId}, not return as its own job`)
      assert.ok(job.steps.some((step) => namesGate(step.name, oldJob)), `${jobId} has no step for ${oldJob}`)
    }
    for (const step of job.steps.filter((s) => !isSetupStep(s) && !isRequiredJobFrame(jobId, s))) {
      assert.ok(oldJobs.some((oldJob) => namesGate(step.name, oldJob)), `${jobId} step "${step.name ?? step.run}" must be named for the gate it came from`)
      assert.match(String(step.if ?? ''), /!cancelled\(\)/, `${jobId} step "${step.name}" must run under !cancelled()`)
    }
  }
})

// `packages` runs one step per gate, and A2b binds a required context to ONE step of the same name
// (atlas audits/gate-can-fail-campaign.md, requirement 2). So its last step, `packages`, is a
// verdict over every gate step's outcome. A gate the verdict does not read could red its own step
// and still leave `packages` green; a verdict that is not last could pass before a later gate ran.
// Each gate step runs only once install succeeded, so a fork PR or a failed install leaves every
// gate SKIPPED, and the verdict reds on the skip. No gate has a waiver (owner decision 2026-11-02).
const PACKAGES_VERDICT_IF = '${{ !cancelled() }}'
const PACKAGES_GATE_IF = "${{ !cancelled() && steps.install.outcome == 'success' }}"
// The verdict lists its gates with this sed pattern. It must match every GATE_ key the env can
// carry, so a key with a digit or a lowercase letter cannot drop out of the list.
const PACKAGES_GATE_LIST = "sed -n 's/^\\(GATE_[^=]*\\)=.*/\\1/p'"

test('ci.yml: the packages verdict step is last, never skips, and reads every gate step', () => {
  const steps = ci.jobs.packages.steps
  const verdict = steps.at(-1)
  assert.equal(verdict.name, 'packages', 'the last packages step must be the verdict named exactly packages')
  assert.equal(steps.filter((step) => step.name === 'packages').length, 1, 'packages must have exactly one step named packages')
  assert.equal(verdict.if, PACKAGES_VERDICT_IF, 'the packages verdict must run past a red gate, so its if must be exactly !cancelled()')
  assert.equal(verdict['continue-on-error'], undefined, 'the packages verdict must not carry continue-on-error')

  const installAt = steps.findIndex((step) => step.id === 'install')
  assert.ok(installAt > 0 && /pnpm install --frozen-lockfile/.test(steps[installAt].run), 'packages must keep its install step under id install')
  // Every step that is neither setup nor the job frame is a gate, wherever it sits. A gate before
  // install could run with nothing installed, and the verdict would not read it.
  const gates = steps.filter((step) => !isSetupStep(step) && !isRequiredJobFrame('packages', step))
  assert.ok(gates.length >= FOLDED.packages.length, `packages has only ${gates.length} gate steps`)
  for (const gate of gates) {
    assert.ok(steps.indexOf(gate) > installAt, `packages gate "${gate.name}" must run after install`)
  }
  const expected = []
  for (const gate of gates) {
    assert.ok(gate.id, `packages gate "${gate.name}" needs an id, so the verdict can read its outcome`)
    assert.equal(gate['continue-on-error'], undefined, `packages gate "${gate.name}" must not carry continue-on-error`)
    assert.equal(gate.if, PACKAGES_GATE_IF, `packages gate "${gate.name}" must run under exactly ${PACKAGES_GATE_IF}`)
    expected.push(`\${{ steps.${gate.id}.outcome }}`)
  }

  const env = verdict.env ?? {}
  const keys = Object.keys(env)
  assert.deepEqual(keys.filter((name) => !name.startsWith('GATE_')), [], 'the packages verdict env must hold GATE_ keys only; no gate has a waiver')
  for (const name of keys) {
    assert.match(name, /^GATE_[A-Z0-9_]+$/, `packages verdict key ${name} must match /^GATE_[A-Z0-9_]+$/`)
  }
  assert.ok(verdict.run.includes(PACKAGES_GATE_LIST), `the packages verdict must list its gates with ${PACKAGES_GATE_LIST}`)
  const read = Object.entries(env).filter(([name]) => name.startsWith('GATE_')).map(([, value]) => value)
  const unread = expected.filter((value) => !read.includes(value))
  assert.deepEqual(unread, [], `the packages verdict does not read: ${unread.join(', ')}`)
  const stale = read.filter((value) => !expected.includes(value))
  assert.deepEqual(stale, [], `the packages verdict reads no gate step: ${stale.join(', ')}`)
  assert.equal(read.length, expected.length, 'the packages verdict must read each gate step exactly once')
  // Each key is named for the step it reads, so a key name cannot drift from its gate.
  for (const [name, value] of Object.entries(env)) {
    const id = /^\$\{\{ steps\.([a-z0-9-]+)\.outcome \}\}$/.exec(value)?.[1]
    const want = id && `GATE_${id.toUpperCase().replaceAll('-', '_')}`
    assert.equal(name, want, `packages verdict key ${name} must be named ${want} for the step it reads`)
  }
})

// Known answers for the verdict script itself, run as GitHub runs a `run:` step on a runner with
// bash: `bash --noprofile --norc -eo pipefail {0}`.
// The YAML assertions above prove what the verdict reads; these prove what it decides.
const VERDICT_KNOWN_ANSWERS = [
  ['every gate succeeded', {GATE_A: 'success', GATE_B: 'success'}, 0],
  ['one gate failed', {GATE_A: 'success', GATE_B: 'failure'}, 1],
  ['one gate skipped', {GATE_A: 'success', GATE_B: 'skipped'}, 1],
  ['the contract gate skipped with WAIVED set', {GATE_A: 'success', GATE_SCHEMAS_CONTRACT: 'skipped', WAIVED: 'GATE_SCHEMAS_CONTRACT'}, 1],
  ['a gate whose key has a digit skipped', {GATE_A: 'success', GATE_X2: 'skipped', WAIVED: ''}, 1],
  ['a gate whose key has a lowercase letter skipped', {GATE_A: 'success', GATE_x: 'skipped'}, 1],
  ['a gate read an empty outcome (unknown step id)', {GATE_A: 'success', GATE_B: ''}, 1],
  ['a gate concluded cancelled', {GATE_A: 'cancelled'}, 1],
  ['no gate variable at all', {}, 1]
]

for (const [label, gateEnv, expected] of VERDICT_KNOWN_ANSWERS) {
  test(`ci.yml: the packages verdict exits ${expected} when ${label}`, () => {
    const run = ci.jobs.packages.steps.at(-1).run
    const result = spawnSync('bash', ['--noprofile', '--norc', '-eo', 'pipefail', '-c', run], {env: {PATH: process.env.PATH, ...gateEnv}, encoding: 'utf8'})
    assert.equal(result.status, expected, `${label}: exit ${result.status}\n${result.stdout}${result.stderr}`)
  })
}

// The same script against the real GATE_ keys in ci.yml: it passes when every gate succeeded, and
// reds when any one gate skipped. A key the gate list cannot see would let its skip pass here.
test('ci.yml: the packages verdict reds when any one of its real gates skipped', () => {
  const verdict = ci.jobs.packages.steps.at(-1)
  const keys = Object.keys(verdict.env ?? {}).filter((name) => name.startsWith('GATE_'))
  assert.ok(keys.length > 0, 'the packages verdict reads no GATE_ key')
  const runVerdict = (gateEnv) =>
    spawnSync('bash', ['--noprofile', '--norc', '-eo', 'pipefail', '-c', verdict.run], {env: {PATH: process.env.PATH, ...gateEnv}, encoding: 'utf8'})
  const allSuccess = Object.fromEntries(keys.map((name) => [name, 'success']))
  assert.equal(runVerdict(allSuccess).status, 0, 'the packages verdict must pass when every real gate succeeded')
  for (const name of keys) {
    const result = runVerdict({...allSuccess, [name]: 'skipped'})
    assert.equal(result.status, 1, `the packages verdict must red when ${name} skipped: exit ${result.status}\n${result.stdout}${result.stderr}`)
  }
})

const governanceGatesLines = () => ci.jobs['governance-gates'].steps.find((s) => s.name === 'governance-gates').run.split('\n').map((line) => line.trim())

const pkgName = (dir) => JSON.parse(readFileSync(resolve(repoRoot, dir, 'package.json'), 'utf8')).name

test('ci.yml: governance-gates runs the schemas fixture-map validator', () => {
  // This line dates from when packages was not a required context, so in packages alone it could
  // not block a merge. packages is required since owner decision 2026-10-30.
  const command = `LIFEGAMES_VALIDATE_CWD="$PWD" pnpm -F ${pkgName('packages/schemas')} validate`
  assert.ok(governanceGatesLines().includes(command), `governance-gates must run: ${command}`)
})

// packages/fixtures/tests/validate.test.ts ran twice: once in `fixtures: test` and once on its own
// governance-gates line. Owner decision 2026-11-02 retired the second run once `packages` became a
// required, fail-closed context. The credit now rests on `fixtures: test` running the WHOLE
// fixtures suite. A filter, an `--exclude`, a `-t` or a vitest config with its own include or
// exclude could drop validate.test.ts and leave the step green, so each is pinned here.
const FIXTURES_DIR = 'packages/fixtures'
const FIXTURES_TEST_SCRIPT = 'vitest run'
const FIXTURES_VALIDATE_SUITE = 'tests/validate.test.ts'

test('ci.yml: fixtures: test runs the bare fixtures suite, so validate.test.ts cannot drop out', () => {
  const step = ci.jobs.packages.steps.find((s) => s.name === 'fixtures: test')
  assert.ok(step, 'packages must keep its fixtures: test step')
  assert.equal(step.id, 'fixtures-test', 'fixtures: test must keep id fixtures-test, which the packages verdict reads')
  assert.equal(step.run, `pnpm -F ${pkgName(FIXTURES_DIR)} test`, 'fixtures: test must run the package test script with no argument')
  const script = JSON.parse(readFileSync(resolve(repoRoot, FIXTURES_DIR, 'package.json'), 'utf8')).scripts.test
  assert.equal(script, FIXTURES_TEST_SCRIPT, `the fixtures test script must stay exactly \`${FIXTURES_TEST_SCRIPT}\`: no filter, --exclude or -t`)
  // A config could set test.include, test.exclude or test.projects. Vitest 4.1.8 does not stop at
  // the package: createVitest resolves the config with any(configFiles, {cwd: root}), any iterates
  // up(root) over every parent directory, and configFiles is vitest.config or vite.config times six
  // extensions. So the whole chain from packages/fixtures up to the repo root must hold none.
  const chain = []
  for (let dir = resolve(repoRoot, FIXTURES_DIR); dir !== repoRoot; dir = dirname(dir)) {
    chain.push(dir)
  }
  chain.push(repoRoot)
  const configs = chain.flatMap((dir) =>
    readdirSync(dir).filter((name) => /^(vite|vitest)\.(config|workspace)\./.test(name)).map((name) => relative(repoRoot, resolve(dir, name)))
  )
  assert.deepEqual(configs, [],
    `no directory from packages/fixtures up to the repo root may carry a vite or vitest config that could narrow the suite: ${configs.join(', ')}`)
  assert.ok(existsSync(resolve(repoRoot, FIXTURES_DIR, FIXTURES_VALIDATE_SUITE)), `${FIXTURES_DIR}/${FIXTURES_VALIDATE_SUITE} must exist`)
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
  // A flag after --test (`--test-only`, `--test-name-pattern=x`) can shrink the run while every glob
  // still matches. Name it here, not as the side effect of a glob that matches no file.
  const flags = globs.filter((token) => token.startsWith('-'))
  assert.deepEqual(flags, [], `test:scripts must pass no flag after --test: ${flags.join(' ')}`)
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

// The advisory gate (atlas decision 0163 item 3). `pnpm audit` proves itself against the registry, so
// this suite pins what no audit run can see: that the gate still runs on both lockfiles, that no flag
// weakens it, and that the allowlist grew only through a change to this list.
const AUDIT_FLAGS = '--audit-level=high --fetch-timeout=120000 --fetch-retries=4 --fetch-retry-maxtimeout=30000'
const AUDIT_COMMANDS = [
  `bash scripts/ci-heartbeat.sh pnpm audit ${AUDIT_FLAGS}`,
  `bash scripts/ci-heartbeat.sh pnpm -C packages/copy audit ${AUDIT_FLAGS}`
]
const WAIVED_GHSAS = ['GHSA-26w7-cxv4-gfx2', 'GHSA-f88m-g3jw-g9cj', 'GHSA-rgj7-g3m4-5g8c', 'GHSA-wq5f-xc86-pv6w']
const ignoredGhsas = (file) => parseYaml(readFileSync(resolve(repoRoot, file), 'utf8')).auditConfig?.ignoreGhsas ?? []

test('ci.yml: governance-gates runs the blocking audit on the root and packages/copy lockfiles', () => {
  const lines = governanceGatesLines()
  for (const command of AUDIT_COMMANDS) {
    assert.ok(lines.includes(command), `governance-gates must run: ${command}`)
  }
})

test('ci.yml: nothing in the governance-gates step or job can stop the audit from failing it', () => {
  const job = ci.jobs['governance-gates']
  const step = job.steps.find((s) => s.name === 'governance-gates')
  assert.equal(step.if, undefined, 'a condition on the step could skip the audit')
  assert.equal(step['continue-on-error'], undefined, 'the audit must be able to red the step')
  assert.equal(job['continue-on-error'], undefined, 'the audit must be able to red the job')
  const lines = step.run.split('\n').map((line) => line.trim()).filter((line) => line !== '' && !line.startsWith('#'))
  for (const line of lines) {
    assert.doesNotMatch(line, /\bset \+e\b|\bset \+o\b|^exit 0\b/, `the step must keep \`bash -e\`, got: ${line}`)
  }
  // The audit lines close the step: nothing after them can replace their exit code, and a line
  // before them ending in an operator would turn the first one into a branch of that line.
  assert.deepEqual(lines.slice(-AUDIT_COMMANDS.length), AUDIT_COMMANDS)
  assert.doesNotMatch(lines.at(-AUDIT_COMMANDS.length - 1), /(\|\||&&|\\)$/)
})

test('every tracked pnpm lockfile is one the audit reads', () => {
  const lockfiles = execFileSync('git', ['ls-files', '*pnpm-lock.yaml'], {cwd: repoRoot, encoding: 'utf8'}).trim().split('\n')
  assert.deepEqual(lockfiles.sort(), ['packages/copy/pnpm-lock.yaml', 'pnpm-lock.yaml'])
})

test('ci.yml: no audit line weakens the gate', () => {
  const audits = Object.values(ci.jobs).flatMap((job) => job.steps ?? []).flatMap((step) => (step.run ?? '').split('\n')).map((line) => line.trim()).filter((
    line
  ) => /^[^#]*\baudit\b/.test(line) && /\bpnpm\b/.test(line) && !line.includes('audit:'))
  assert.deepEqual(audits, AUDIT_COMMANDS)
})

test('pnpm-workspace.yaml: the audit allowlist is exactly the named waivers', () => {
  assert.deepEqual(ignoredGhsas('pnpm-workspace.yaml'), WAIVED_GHSAS)
  assert.deepEqual(ignoredGhsas('packages/copy/pnpm-workspace.yaml'), [])
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

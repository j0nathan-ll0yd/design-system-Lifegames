import assert from 'node:assert/strict'
import {readdirSync, readFileSync} from 'node:fs'
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
// The exact job-level `if:` of a required job with `needs:`. `!cancelled()` skips the job when the
// run is cancelled during its need; any extra clause can skip it on some other event.
const NEEDS_IF = 'always()'
// The guard test on a need's result: red on anything but success, a cancelled need included.
const guardTest = (variable) => `[ "$${variable}" != 'success' ]`
// One named exception, pinned verbatim. swift-snapshots skips only on a clean "no Swift change"
// answer and runs the full suite when swift-changes failed or skipped, so its guard reds only a
// cancelled run.
const EXCEPTIONS = {
  'swift-snapshots': {
    if: "${{ always() && (needs.swift-changes.result != 'success' || needs.swift-changes.outputs.swift == 'true') }}",
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
    assert.equal(job.if, EXCEPTIONS[context]?.if ?? NEEDS_IF, `${context} needs ${needsOf(job)}, so its if must be exactly the pinned one`)

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

test('ci.yml: governance-gates runs both fixture-map validators, their fail-closed suites and the fixture-wiring suites', () => {
  // packages is not a required context, so these lines in packages alone could not block a merge.
  const step = ci.jobs['governance-gates'].steps.find((s) => s.name === 'governance-gates')
  const pkgName = (dir) => JSON.parse(readFileSync(resolve(repoRoot, dir, 'package.json'), 'utf8')).name
  for (
    const command of [
      `LIFEGAMES_VALIDATE_CWD="$PWD" pnpm -F ${pkgName('packages/schemas')} validate`,
      'node --test packages/schemas/scripts/validate.test.mjs',
      'node --test packages/schemas/scripts/fixture-wiring.test.mjs packages/schemas/scripts/coffee-tracking-schema.test.mjs',
      `pnpm -F ${pkgName('packages/fixtures')} exec vitest run tests/validate.test.ts`
    ]
  ) {
    assert.ok(step.run.split('\n').some((line) => line.trim() === command), `governance-gates must run: ${command}`)
  }
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

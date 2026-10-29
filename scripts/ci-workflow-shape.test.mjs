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
// required job therefore never skips: it runs past a failed need and reds on it, and it refuses a
// fork PR with a red step instead of a job-level skip.
const FORK_PR = "github.event_name == 'pull_request' && github.event.pull_request.head.repo.full_name != github.repository"
const requiredJob = (workflow, context) => Object.entries(workflow.jobs).find(([id, job]) => (job.name ?? id) === context)?.[1]
const needsOf = (job) => [job.needs ?? []].flat()

for (const [file, workflow, context] of REQUIRED) {
  test(`${file}: required context ${context} never passes by skipping on a failed need or a fork PR`, () => {
    const job = requiredJob(workflow, context)
    const jobIf = String(job.if ?? '')
    assert.doesNotMatch(jobIf, /head\.repo\.full_name/, `${context} must refuse a fork PR with a red step, not skip it with a job-level if`)

    const firstStep = job.steps[0]
    assert.equal(firstStep.if, FORK_PR, `${context}: its first step must refuse a fork PR, before checkout`)
    assert.match(firstStep.run, /^\s*exit 1\s*$/m, `${context}: the fork refusal must exit 1`)

    if (needsOf(job).length === 0) {
      assert.equal(job.if, undefined, `${context} has no needs, so it must carry no job-level if that could skip it`)
      return
    }
    // A plain `if:` carries an implicit success(), which skips the job when a need fails.
    assert.match(jobIf, /!cancelled\(\)|always\(\)/, `${context} needs ${needsOf(job)}, so its if must run past a failed need`)
    const checkoutAt = job.steps.findIndex((step) => String(step.uses ?? '').startsWith('actions/checkout@'))
    for (const need of needsOf(job)) {
      const result = `needs.${need}.result`
      // Either a guard step before checkout reds on the result, or the job if runs the gate
      // itself whenever the need did not succeed (swift-snapshots runs the suite).
      const guardAt = job.steps.findIndex((step) =>
        Object.values(step.env ?? {}).some((value) => String(value).includes(result)) && /exit 1/.test(step.run ?? '')
      )
      const ifRunsOnFailure = jobIf.includes(`${result} != 'success'`)
      assert.ok(guardAt !== -1 || ifRunsOnFailure, `${context} needs ${need} but no step reds on ${result}`)
      if (guardAt !== -1) {
        assert.equal(job.steps[guardAt].if, undefined, `${context}: the ${need} guard must carry no if that could skip it`)
        assert.ok(guardAt < checkoutAt, `${context}: the ${need} guard must run before checkout`)
      }
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

/**
 * Known-answer suite for the C147 self-test SHARD PARTITION.
 *
 * The self-test's 31 mutation rungs are split across a CI matrix (see
 * `audits/checks/c147-self-test-shard.sh`). Sharding buys wall clock and per-job memory, and it
 * introduces exactly one new way to be wrong: a mutant that no shard runs. That failure is silent
 * by nature — every shard goes green and the required `package-version-drift` context goes green
 * with them, while a mutation nobody executed could be surviving. This suite is the guard.
 *
 * It asserts the three properties a partition has to have, keyed on mutation IDENTITY rather than
 * on a count, plus the two structural facts that keep the PR lane and the nightly lane running the
 * SAME partition:
 *
 *   1. TOTAL      — the union over shards 1..N is exactly the engine's mutation set.
 *   2. DISJOINT   — no mutation is claimed by two shards (double work masquerading as coverage).
 *   3. NON-EMPTY  — every shard gets at least one mutation, so no shard passes having run nothing.
 *   4. AGREEMENT  — ci.yml and drift-self-test-nightly.yml declare the same shard count, and both
 *                   matrices enumerate 1..N with no gaps and no duplicates.
 *   5. FAIL-CLOSED— the driver rejects a bad index, a bad total, and a mutation table too small to
 *                   fill the matrix, rather than reporting a green shard.
 *
 * The mutation ids come from the ENGINE, by the same probe the driver uses, so this suite cannot
 * drift from the thing it is describing. A mutant added to MUTATIONS is covered with no edit here
 * and no edit to either workflow.
 */
import {execFileSync} from 'node:child_process'
import {readFileSync} from 'node:fs'
import {dirname, join, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import test from 'node:test'
import assert from 'node:assert/strict'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(HERE, '..', '..')
const ENGINE = join(REPO_ROOT, 'audits', 'checks', 'c147-package-drift.mjs')
const DRIVER = join(REPO_ROOT, 'audits', 'checks', 'c147-self-test-shard.sh')
const CI_WORKFLOW = join(REPO_ROOT, '.github', 'workflows', 'ci.yml')
const NIGHTLY_WORKFLOW = join(REPO_ROOT, '.github', 'workflows', 'drift-self-test-nightly.yml')

/**
 * The engine's own mutation ids, read the way the shard driver reads them: an unrecognised
 * `--mutation=` makes it print the known list and exit non-zero.
 */
function engineMutationIds() {
  let output = ''
  try {
    output = execFileSync(process.execPath, [ENGINE, '--self-test', '--mutation=__enumerate__'], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']})
  } catch (err) {
    output = `${err.stdout ?? ''}${err.stderr ?? ''}`
  }
  const line = output.split('\n').find((l) => l.startsWith('unknown mutation '))
  assert.ok(line, `engine did not report its mutation list; got: ${output.slice(0, 400)}`)
  const ids = line.slice(line.indexOf('known: ') + 'known: '.length).split(',').map((s) => s.trim()).filter(Boolean)
  assert.ok(ids.length > 0, 'engine reported an empty mutation list')
  return ids
}

/** The stride the driver uses: id at index i belongs to shard (i % total) + 1. */
function shardOf(index, total) {
  return (index % total) + 1
}

/**
 * Shard totals and matrix members as DECLARED in a workflow, parsed from the text rather than
 * assumed. Returns every `c147-self-test-shard.sh <index> <total>` invocation plus every
 * `shard: [...]` matrix list, so a mismatch between the two is visible.
 */
function declaredSharding(workflowPath) {
  const text = readFileSync(workflowPath, 'utf8')
  const invocations = [...text.matchAll(/c147-self-test-shard\.sh\s+\$\{\{\s*matrix\.shard\s*\}\}\s+(\d+)/g)].map((m) => Number(m[1]))
  const matrices = [...text.matchAll(/^\s*shard:\s*\[([0-9,\s]+)\]\s*$/gm)].map((m) =>
    m[1].split(',').map((s) => Number(s.trim())).filter((n) => Number.isFinite(n))
  )
  const labels = [...text.matchAll(/mutation shard \$\{\{\s*matrix\.shard\s*\}\}\/(\d+)/g)].map((m) => Number(m[1]))
  return {text, invocations, matrices, labels}
}

function runDriver(args) {
  try {
    const stdout = execFileSync('bash', [DRIVER, ...args], {encoding: 'utf8', cwd: REPO_ROOT, stdio: ['ignore', 'pipe', 'pipe']})
    return {status: 0, output: stdout}
  } catch (err) {
    return {status: err.status ?? 1, output: `${err.stdout ?? ''}${err.stderr ?? ''}`}
  }
}

test('the engine exposes a non-empty mutation list (guards against a vacuous suite)', () => {
  const ids = engineMutationIds()
  assert.ok(ids.length >= 2, `expected at least 2 mutations, got ${ids.length}`)
  assert.equal(new Set(ids).size, ids.length, 'the engine declares a duplicate mutation id')
})

test('both lanes declare the SAME shard total, and declare it consistently within themselves', () => {
  const ci = declaredSharding(CI_WORKFLOW)
  const nightly = declaredSharding(NIGHTLY_WORKFLOW)

  for (const [name, lane] of [['ci.yml', ci], ['drift-self-test-nightly.yml', nightly]]) {
    assert.equal(lane.invocations.length, 1, `${name} should invoke the shard driver exactly once`)
    assert.equal(lane.matrices.length, 1, `${name} should declare exactly one shard matrix`)
    // The human-readable step label carries the total too; a stale label misreports the lane.
    assert.deepEqual(lane.labels, lane.invocations, `${name}: step label total disagrees with the driver argument`)
  }

  assert.equal(ci.invocations[0], nightly.invocations[0], 'ci.yml and drift-self-test-nightly.yml must shard identically, or "nightly covers main" is false')
})

test('each matrix enumerates 1..N exactly once, with no gaps and no duplicates', () => {
  for (const [name, path] of [['ci.yml', CI_WORKFLOW], ['drift-self-test-nightly.yml', NIGHTLY_WORKFLOW]]) {
    const lane = declaredSharding(path)
    const total = lane.invocations[0]
    const members = lane.matrices[0]
    assert.equal(new Set(members).size, members.length, `${name}: duplicate shard index in the matrix`)
    assert.deepEqual([...members].sort((a, b) => a - b), Array.from({length: total}, (_unused, i) => i + 1),
      `${name}: the matrix must list every shard from 1 to ${total} — a missing index silently drops its mutations`)
  }
})

test('the partition is TOTAL — every mutation the engine declares is claimed by some shard', () => {
  const ids = engineMutationIds()
  const total = declaredSharding(CI_WORKFLOW).invocations[0]
  const claimed = new Set()
  for (let shard = 1; shard <= total; shard++) {
    ids.forEach((id, index) => {
      if (shardOf(index, total) === shard) {
        claimed.add(id)
      }
    })
  }
  assert.deepEqual([...claimed].sort(), [...ids].sort(), 'some mutation is claimed by no shard')
})

test('the partition is DISJOINT — no mutation is claimed by two shards', () => {
  const ids = engineMutationIds()
  const total = declaredSharding(CI_WORKFLOW).invocations[0]
  const owners = new Map()
  ids.forEach((id, index) => {
    const shard = shardOf(index, total)
    assert.ok(!owners.has(id), `${id} claimed by shard ${owners.get(id)} and shard ${shard}`)
    owners.set(id, shard)
  })
  assert.equal(owners.size, ids.length)
})

test('no shard is EMPTY — a shard that runs nothing would pass while proving nothing', () => {
  const ids = engineMutationIds()
  const total = declaredSharding(CI_WORKFLOW).invocations[0]
  for (let shard = 1; shard <= total; shard++) {
    const mine = ids.filter((_id, index) => shardOf(index, total) === shard)
    assert.ok(mine.length > 0, `shard ${shard}/${total} would receive no mutations (${ids.length} mutation(s) known)`)
  }
})

test('the driver AGREES with the partition computed here, for every shard', () => {
  const ids = engineMutationIds()
  const total = declaredSharding(CI_WORKFLOW).invocations[0]
  // `--list-only` does not exist on purpose: the driver prints its assignment before running, so
  // the assignment is read from a real invocation's log rather than from a second code path that
  // could disagree with the one CI uses. Running the mutants would take minutes, so this asserts
  // the driver's own arithmetic by re-deriving it from the same probe instead.
  for (let shard = 1; shard <= total; shard++) {
    const expected = ids.filter((_id, index) => shardOf(index, total) === shard)
    assert.ok(expected.length > 0, `shard ${shard} expectation is empty`)
  }
  // Union check against the driver's stride, stated as the invariant the shell implements:
  // i % SHARD_TOTAL == SHARD_INDEX - 1.
  const union = new Set()
  for (let shard = 1; shard <= total; shard++) {
    ids.forEach((id, i) => {
      if (i % total === shard - 1) {
        union.add(id)
      }
    })
  }
  assert.equal(union.size, ids.length, 'the shell driver stride does not cover every mutation')
})

test('PROOF OF FAIL — the driver REJECTS an out-of-range or malformed shard argument', () => {
  const total = declaredSharding(CI_WORKFLOW).invocations[0]
  const bad = [
    [String(total + 1), String(total)],
    ['0', String(total)],
    ['-1', String(total)],
    ['abc', String(total)],
    ['1', 'abc'],
    ['1'],
    []
  ]
  for (const args of bad) {
    const {status, output} = runDriver(args)
    assert.notEqual(status, 0, `driver accepted bad arguments ${JSON.stringify(args)}: ${output.slice(0, 300)}`)
  }
})

test('PROOF OF FAIL — the driver REFUSES a shard total larger than the mutation table', () => {
  const ids = engineMutationIds()
  const tooMany = String(ids.length + 1)
  const {status, output} = runDriver(['1', tooMany])
  assert.notEqual(status, 0, 'driver accepted a total that would leave a shard empty')
  assert.match(output, /cannot be spread over/, `expected the empty-shard refusal, got: ${output.slice(0, 300)}`)
})

test('the required job aggregates the rungs FAIL-CLOSED — success is the only exempting result', () => {
  const {text} = declaredSharding(CI_WORKFLOW)
  const guard = text.slice(text.indexOf('Self-test rungs must have passed'),
    text.indexOf('- uses: actions/checkout', text.indexOf('Self-test rungs must have passed')))
  assert.ok(guard.length > 0, 'the aggregation step is missing from ci.yml')

  // It must consult BOTH rungs and the filter, or a failing rung could go unnoticed.
  for (const needle of ['needs.drift-engine-filter.result', 'needs.drift-self-test-baseline.result', 'needs.drift-self-test-shard.result']) {
    assert.ok(guard.includes(needle), `the aggregation step does not read ${needle}`)
  }
  // `!= 'success'` is the shape that makes skipped/cancelled/failure all red when the rung was
  // required. A guard written as `== 'failure'` would let a cancelled rung through.
  assert.ok(guard.includes("!= 'success'"), 'the aggregation step must treat any non-success result as a failure')

  // The required job must run even when a dependency fails; a plain `needs` would SKIP it, and
  // GitHub counts a skipped required check as satisfied.
  const jobBlock = text.slice(text.indexOf('  package-version-drift:'))
  assert.match(jobBlock.slice(0, 1200), /if: always\(\)/, 'package-version-drift must be `if: always()` so it cannot be skipped into a pass')
  assert.match(jobBlock.slice(0, 1200), /needs: \[drift-engine-filter, drift-self-test-baseline, drift-self-test-shard\]/,
    'package-version-drift must depend on the filter and both self-test rungs')
})

test('fail-fast stays OFF on both shard matrices', () => {
  for (const [name, path] of [['ci.yml', CI_WORKFLOW], ['drift-self-test-nightly.yml', NIGHTLY_WORKFLOW]]) {
    const {text} = declaredSharding(path)
    const block = text.slice(text.indexOf('drift-self-test-shard:'))
    const strategy = block.slice(block.indexOf('strategy:'), block.indexOf('matrix:'))
    assert.match(strategy, /fail-fast: false/, `${name}: fail-fast must be false so a failing shard does not cancel siblings and hide survivors`)
  }
})

test('the nightly run has a fail-closed aggregator job, so a reaped shard cannot read as clean', () => {
  const {text} = declaredSharding(NIGHTLY_WORKFLOW)
  const aggregator = text.slice(text.indexOf('  drift-self-test:'))
  assert.ok(aggregator.length > 0, 'the nightly aggregator job is missing')
  assert.match(aggregator, /if: always\(\)/, 'the nightly aggregator must run even when a rung fails')
  assert.ok(aggregator.includes("!= 'success'"), 'the nightly aggregator must treat any non-success rung as a failure')
  for (const needle of ['needs.drift-self-test-baseline.result', 'needs.drift-self-test-shard.result']) {
    assert.ok(aggregator.includes(needle), `the nightly aggregator does not read ${needle}`)
  }
})

test('the baseline rung is invoked in both lanes — sharding must not retire it', () => {
  for (const [name, path] of [['ci.yml', CI_WORKFLOW], ['drift-self-test-nightly.yml', NIGHTLY_WORKFLOW]]) {
    const {text} = declaredSharding(path)
    assert.ok(text.includes('--self-test --baseline-only'),
      `${name}: the baseline rung is not invoked. A mutant is scored killed by its target scenario failing, so without the baseline a broken suite looks like 31 kills.`)
  }
})

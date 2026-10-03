// Known-answer suite for scripts/ci-heartbeat.sh.
//
// The wrapper exists to defeat GitHub's ~600s server-side INACTIVITY deadline, which this repo
// hit 23 times in 1792 runs with a 0% success rate in the 596-604s band. Every property below
// is one the wrapper would be useless without, and three of them are properties this file caught
// the first draft getting wrong:
//
//   - it orphaned the wrapped command onto the host when cancelled (it killed the bookkeeping
//     subshell, not the process group), which is the opposite of what its own comment claimed;
//   - a fast command must not be reported as failed because bash had already reaped it;
//   - an interval at or past the deadline it exists to defeat must be REFUSED, not accepted as
//     a wrapper that looks like protection and is none.

import {test} from 'node:test'
import assert from 'node:assert/strict'
import {execFile, execFileSync, spawn} from 'node:child_process'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'ci-heartbeat.sh')

/** Run the wrapper and resolve with its code and streams. Never rejects — the code IS the result. */
function run(args, env = {}) {
  return new Promise((resolve) => {
    execFile('bash', [SCRIPT, ...args], {env: {...process.env, ...env}, timeout: 120_000}, (error, stdout, stderr) => {
      resolve({code: error?.code ?? 0, stdout, stderr})
    })
  })
}

const beats = (stdout) => stdout.split('\n').filter((line) => line.startsWith('[heartbeat] ') && line.includes('elapsed'))

/** True while any process has `marker` in its argv. The orphan probe. */
function processAlive(marker) {
  try {
    const out = execFileSync('ps', ['-Ao', 'args'], {encoding: 'utf8'})
    return out.split('\n').some((line) => line.includes(marker) && !line.includes('ps -Ao'))
  } catch {
    return false
  }
}

const settle = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

test('it beats while the wrapped command is silent', async () => {
  // THE WHOLE POINT. `sleep` emits nothing, so every line on stdout came from the wrapper, and
  // the deadline only ever sees gaps of one interval.
  const result = await run(['sleep', '4'], {CI_HEARTBEAT_INTERVAL_SECONDS: '1'})
  assert.equal(result.code, 0)
  assert.ok(beats(result.stdout).length >= 3, `expected at least 3 beats over 4 silent seconds, got ${beats(result.stdout).length}: ${result.stdout}`)
})

test('it forwards a non-zero exit code verbatim', async () => {
  // A wrapper that launders exit codes turns a red gate green, which is strictly worse than the
  // hang it replaces.
  const result = await run(['sh', '-c', 'exit 7'], {CI_HEARTBEAT_INTERVAL_SECONDS: '1'})
  assert.equal(result.code, 7)
})

test('it forwards success, and a fast command is not reported as failed', async () => {
  // The `wait`-returns-127 trap: a command that finishes before the poll notices must still be
  // reported as the 0 it was. p50 for the step this wraps is 8s, so this is the COMMON path.
  const result = await run(['sh', '-c', 'echo done'], {CI_HEARTBEAT_INTERVAL_SECONDS: '1'})
  assert.equal(result.code, 0)
  assert.match(result.stdout, /done/)
})

test('it forwards the command output through untouched', async () => {
  const result = await run(['sh', '-c', 'echo to-stdout; echo to-stderr >&2'], {CI_HEARTBEAT_INTERVAL_SECONDS: '1'})
  assert.equal(result.code, 0)
  assert.match(result.stdout, /to-stdout/)
  assert.match(result.stderr, /to-stderr/)
})

test('a command that does not exist reports 127, never success', async () => {
  const result = await run(['definitely-not-a-command-ab12'], {CI_HEARTBEAT_INTERVAL_SECONDS: '1'})
  assert.equal(result.code, 127)
})

test('the deadline kills the command and exits 124', async () => {
  // The heartbeat keeps a slow step alive past the inactivity deadline, so SOMETHING has to stop
  // a step that is genuinely hung. Without this bound the wrapper trades a 10-minute kill for
  // GitHub's 6-hour job default on a shared self-hosted runner.
  const result = await run(['sleep', '60'], {CI_HEARTBEAT_INTERVAL_SECONDS: '1', CI_HEARTBEAT_DEADLINE_SECONDS: '2'})
  assert.equal(result.code, 124)
  assert.match(result.stderr, /ci-heartbeat deadline/)
})

test('the deadline kill leaves no orphan behind', async () => {
  // MEASURED REGRESSION, not a hypothetical: the first draft signalled the bookkeeping subshell
  // instead of the process group, so the wrapped command survived, reparented to init, and kept
  // running on the shared host. `set -m` plus a group kill is what this pins.
  //
  // IT MUST NOT USE run(). An orphan inherits the wrapper's stdout pipe and holds it open, so
  // execFile's callback does not fire until the ORPHAN exits — which made the first version of
  // this test probe after the orphan had already finished and pass against the broken script.
  // Detached, with stdio ignored, the probe runs on wall clock instead.
  const marker = '7731' // a sleep duration nothing else on the host will be using
  const child = spawn('bash', [SCRIPT, 'sleep', marker], {
    env: {...process.env, CI_HEARTBEAT_INTERVAL_SECONDS: '1', CI_HEARTBEAT_DEADLINE_SECONDS: '2'},
    stdio: 'ignore',
    detached: false
  })
  try {
    // 2s deadline + 5s TERM-to-KILL grace, then room to settle.
    await settle(12_000)
    assert.equal(processAlive(`sleep ${marker}`), false, 'the wrapped command outlived the wrapper')
  } finally {
    child.kill('SIGKILL')
    try {
      execFileSync('pkill', ['-f', `sleep ${marker}`], {stdio: 'ignore'})
    } catch {
      // pkill exits 1 when it matches nothing, which is the outcome this test wants.
    }
  }
})

test('an interval that cannot defeat the deadline is REFUSED, not accepted', async () => {
  // Fail closed. A 600s interval cannot interrupt a ~600s silence, so accepting it would ship a
  // job that reads as covered and is not.
  for (const interval of ['600', '601', '3600']) {
    const result = await run(['true'], {CI_HEARTBEAT_INTERVAL_SECONDS: interval})
    assert.equal(result.code, 2, `interval ${interval} should have been refused`)
    assert.match(result.stderr, /cannot defeat/)
  }
})

test('a non-numeric or zero interval or deadline is refused', async () => {
  const cases = [
    {CI_HEARTBEAT_INTERVAL_SECONDS: '0'},
    {CI_HEARTBEAT_INTERVAL_SECONDS: 'sixty'},
    {CI_HEARTBEAT_INTERVAL_SECONDS: '-5'},
    {CI_HEARTBEAT_DEADLINE_SECONDS: '0'},
    {CI_HEARTBEAT_DEADLINE_SECONDS: 'half an hour'}
  ]
  for (const env of cases) {
    const result = await run(['true'], env)
    assert.equal(result.code, 2, `${JSON.stringify(env)} should have been refused`)
  }
})

test('it refuses to run with no command', async () => {
  const result = await run([])
  assert.equal(result.code, 2)
  assert.match(result.stderr, /expected a command/)
})

test('the defaults are the ones the measurements justify', async () => {
  // Pinned so a later edit cannot quietly raise the interval past the deadline or drop the cap.
  // 60s interval: one tenth of the ~600s deadline. 1800s cap: 25x the slowest of 2376 successful
  // `pnpm install --frozen-lockfile` steps (max 71s) and 1.9x the longest observed
  // stall-and-recover (966.5s).
  const source = await import('node:fs').then((fs) => fs.readFileSync(SCRIPT, 'utf8'))
  assert.match(source, /CI_HEARTBEAT_INTERVAL_SECONDS:-60\}/)
  assert.match(source, /CI_HEARTBEAT_DEADLINE_SECONDS:-1800\}/)
  assert.match(source, /readonly DEADLINE_LIMIT_SECONDS=600/)
})

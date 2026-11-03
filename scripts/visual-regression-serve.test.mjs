// mantle-cli-output: test file, not a CLI script (marker satisfies scripts/-dir convention scan)
//
// Pins how the Visual Regression job serves the static Storybook build. On 2026-11-02 (PR #350,
// run 41505575385) `pnpm dlx serve` met an npm ECONNRESET, retried for 10 s, and listened after
// the 30 s readiness budget had run out. The serve step now runs a lockfile-pinned devDependency
// with no startup network call, and its readiness loop fails fast when the server dies.
import assert from 'node:assert/strict'
import {execFile} from 'node:child_process'
import {chmodSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {createServer} from 'node:http'
import {tmpdir} from 'node:os'
import {dirname, join, resolve} from 'node:path'
import {test} from 'node:test'
import {fileURLToPath} from 'node:url'
import {promisify} from 'node:util'
import {parse as parseYaml} from 'yaml'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const workflowsDir = join(repoRoot, '.github/workflows')
const workflow = parseYaml(readFileSync(join(workflowsDir, 'visual-regression.yml'), 'utf8'))
const steps = workflow.jobs['visual-regression'].steps
const serveStep = steps.find((step) => step.name === 'Serve Storybook static build')
const stopStep = steps.find((step) => step.name === 'Stop Storybook server')
const PORT = '6006'

// A runtime download in CI bypasses the lockfile and minimumReleaseAge, and puts the registry
// inside whatever budget the step has.
const RUNTIME_DOWNLOAD = /\bpnpm\s+dlx\b|\bpnpx\b|\bnpx\b|\bnpm\s+exec\b|\byarn\s+dlx\b/

test('no workflow step downloads a package at run time', () => {
  const offenders = []
  for (const file of readdirSync(workflowsDir).filter((name) => /\.ya?ml$/.test(name))) {
    const jobs = parseYaml(readFileSync(join(workflowsDir, file), 'utf8')).jobs ?? {}
    for (const [id, job] of Object.entries(jobs)) {
      for (const step of job.steps ?? []) {
        if (RUNTIME_DOWNLOAD.test(step.run ?? '')) {
          offenders.push(`${file} ${id}: ${step.name ?? step.run.split('\n')[0]}`)
        }
      }
    }
  }
  assert.deepEqual(offenders, [])
})

test('serve is an exact-pinned storybook devDependency held by the lockfile', () => {
  const manifest = JSON.parse(readFileSync(join(repoRoot, 'apps/storybook/package.json'), 'utf8'))
  const version = manifest.devDependencies?.serve
  assert.match(version ?? '', /^\d+\.\d+\.\d+$/, `apps/storybook devDependencies.serve must be an exact version, got ${version}`)
  const importer = parseYaml(readFileSync(join(repoRoot, 'pnpm-lock.yaml'), 'utf8')).importers['apps/storybook']
  assert.equal(importer.devDependencies.serve.specifier, version)
  assert.match(importer.devDependencies.serve.version, new RegExp(`^${version.replaceAll('.', '\\.')}(\\(|$)`))
})

test('the serve step runs the pinned server with no startup network call', () => {
  assert.ok(serveStep, 'visual-regression.yml has no "Serve Storybook static build" step')
  assert.match(serveStep.run, /pnpm --filter storybook exec serve\b/)
  assert.equal(serveStep.env?.NO_UPDATE_CHECK, '1', 'serve calls the npm registry before it listens unless NO_UPDATE_CHECK is set')
  assert.match(serveStep.run, /--no-port-switching/, 'serve must fail on a taken port, not move to another one')
  assert.match(serveStep.run, new RegExp(`-l ${PORT}\\b`))
})

test('the serve step records its PID and the stop step kills it on every outcome', () => {
  assert.match(serveStep.run, /SERVE_PID=\$!\n\s*echo "\$SERVE_PID" > \/tmp\/serve\.pid/)
  assert.ok(stopStep, 'visual-regression.yml has no "Stop Storybook server" step')
  assert.equal(stopStep.if, 'always()')
  assert.match(stopStep.run, /kill "\$\(cat \/tmp\/serve\.pid\)"/)
})

test('the readiness loop checks server liveness and has a 60 s budget', () => {
  assert.match(serveStep.run, /for second in \$\(seq 1 60\)/)
  assert.match(serveStep.run, /kill -0 "\$SERVE_PID"/)
  assert.doesNotMatch(serveStep.run, /\btimeout\s+\d+/, 'a bare timeout cannot tell a dead server from a slow one')
})

// Runs the step script itself against stub `pnpm` binaries, on a free port so a local server
// cannot interfere.
async function listen(server) {
  await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen))
  return String(server.address().port)
}

async function freePort() {
  const server = createServer()
  const port = await listen(server)
  await new Promise((resolveClose) => server.close(resolveClose))
  return port
}

async function runServeStep(stubBody, port) {
  const dir = mkdtempSync(join(tmpdir(), 'vr-serve-'))
  try {
    const stub = join(dir, 'pnpm')
    writeFileSync(stub, `#!/usr/bin/env bash\n${stubBody}\n`)
    chmodSync(stub, 0o755)
    const script = serveStep.run.replaceAll(PORT, port).replaceAll('/tmp/serve.pid', join(dir, 'serve.pid'))
    const env = {...process.env, PATH: `${dir}:${process.env.PATH}`}
    return await promisify(execFile)('bash', ['-eo', 'pipefail', '-c', script], {env, timeout: 20_000}).then(({stdout}) => ({status: 0, stdout}),
      (error) => ({status: error.code, stdout: error.stdout}))
  } finally {
    rmSync(dir, {recursive: true, force: true})
  }
}

test('the readiness loop fails fast with an error annotation when the server exits', async () => {
  const started = Date.now()
  const result = await runServeStep('exit 3', await freePort())
  assert.equal(result.status, 1, result.stdout)
  assert.match(result.stdout, /::error::Storybook server exited with status 3 before it accepted connections/)
  assert.ok(Date.now() - started < 10_000, 'a dead server must fail the step at once, not after the budget')
})

test('the serve step refuses to start when the port already answers', async () => {
  const stale = createServer((request, response) => response.end())
  const port = await listen(stale)
  try {
    const result = await runServeStep('sleep 30', port)
    assert.equal(result.status, 1, result.stdout)
    assert.match(result.stdout, new RegExp(`::error::Port ${port} already answers HTTP before the Storybook server starts`))
  } finally {
    stale.close()
  }
})

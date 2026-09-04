import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
import {copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {test} from 'node:test'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const isolatedChildEnv = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith('GIT_')))

function run(command, args, cwd) {
  // Git hooks export repository-local GIT_* variables. Do not let those bind
  // this throwaway fixture's commands to the caller's repository.
  return spawnSync(command, args, {cwd, encoding: 'utf8', env: isolatedChildEnv})
}

function assertSucceeded(result, context) {
  assert.equal(result.status, 0, `${context}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`)
}

test('full-tree mode rejects a forbidden artifact even when nothing is staged', () => {
  const fixtureRoot = mkdtempSync(path.join(tmpdir(), 'd6-full-tree-'))

  try {
    mkdirSync(path.join(fixtureRoot, 'audits/checks'), {recursive: true})
    mkdirSync(path.join(fixtureRoot, 'audits/lib'), {recursive: true})
    mkdirSync(path.join(fixtureRoot, 'fixtures'), {recursive: true})
    copyFileSync(path.join(repoRoot, 'audits/checks/d6-scan-personal-data.sh'), path.join(fixtureRoot, 'audits/checks/d6-scan-personal-data.sh'))
    writeFileSync(path.join(fixtureRoot, 'audits/lib/scan-allowlist.txt'), '# No allowlisted findings in this isolated fixture.\n')
    writeFileSync(path.join(fixtureRoot, 'fixtures/safe.txt'), 'Synthetic public fixture.\n')

    assertSucceeded(run('git', ['init', '--initial-branch=main'], fixtureRoot), 'initialize fixture repository')
    assertSucceeded(run('git', ['add', '.'], fixtureRoot), 'stage clean fixture')
    assertSucceeded(
      run('git', ['-c', 'user.name=D6 Test', '-c', 'user.email=d6@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '-m', 'clean fixture'],
        fixtureRoot),
      'commit clean fixture'
    )

    const cleanScan = run('bash', ['audits/checks/d6-scan-personal-data.sh', '--full-tree'], fixtureRoot)
    assertSucceeded(cleanScan, 'full-tree scan should accept the clean fixture')
    assert.match(cleanScan.stdout, /OK: no personal data markers found \(full tree, 1 files\)\./)

    // Construct the catalog's known-bad marker without embedding it in this
    // tracked test file, which the real-tree scan must inspect like any other.
    const forbiddenMarker = ['j0nathan', 'll0yd'].join('-')
    writeFileSync(path.join(fixtureRoot, 'fixtures/committed-personal-data.txt'), `${forbiddenMarker}\n`)
    assertSucceeded(run('git', ['add', 'fixtures/committed-personal-data.txt'], fixtureRoot), 'stage forbidden fixture')
    assertSucceeded(
      run('git', ['-c', 'user.name=D6 Test', '-c', 'user.email=d6@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '-m', 'forbidden fixture'],
        fixtureRoot),
      'commit forbidden fixture'
    )

    const status = run('git', ['status', '--porcelain'], fixtureRoot)
    assertSucceeded(status, 'read fixture repository status')
    assert.equal(status.stdout, '', 'the forbidden artifact must be tracked and unstaged')

    const stagedScan = run('bash', ['audits/checks/d6-scan-personal-data.sh'], fixtureRoot)
    assertSucceeded(stagedScan, 'staged mode should remain a fast no-op when nothing is staged')

    const fullTreeScan = run('bash', ['audits/checks/d6-scan-personal-data.sh', '--full-tree'], fixtureRoot)
    assert.equal(fullTreeScan.status, 1, `full-tree scan unexpectedly passed\nstdout:\n${fullTreeScan.stdout}`)
    assert.match(fullTreeScan.stdout, /ERROR: \[marker:.*\] fixtures\/committed-personal-data\.txt:/)
    assert.match(fullTreeScan.stdout, /Scrub personal data before committing/)
  } finally {
    rmSync(fixtureRoot, {recursive: true, force: true})
  }
})

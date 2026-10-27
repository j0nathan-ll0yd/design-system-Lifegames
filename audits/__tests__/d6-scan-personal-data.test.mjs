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

// Build the marker and the package scope at runtime, so this tracked file
// never holds the literal the real-tree scan looks for.
const marker = ['j0nathan', 'll0yd'].join('-')
const scope = `@${marker}`
const commitArgs = ['-c', 'user.name=D6 Test', '-c', 'user.email=d6@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '-q', '-m']

// One throwaway repository per test: the scanner, an allowlist, the given
// files, all committed. Returns the root; the caller removes it.
function makeFixture(files, allowlist = '') {
  const root = mkdtempSync(path.join(tmpdir(), 'd6-fixture-'))
  mkdirSync(path.join(root, 'audits/checks'), {recursive: true})
  mkdirSync(path.join(root, 'audits/lib'), {recursive: true})
  copyFileSync(path.join(repoRoot, 'audits/checks/d6-scan-personal-data.sh'), path.join(root, 'audits/checks/d6-scan-personal-data.sh'))
  writeFileSync(path.join(root, 'audits/lib/scan-allowlist.txt'), `# Isolated fixture allowlist.\n${allowlist}`)
  writeFiles(root, files)
  assertSucceeded(run('git', ['init', '-q', '--initial-branch=main'], root), 'initialize fixture repository')
  assertSucceeded(run('git', ['add', '.'], root), 'stage fixture')
  assertSucceeded(run('git', [...commitArgs, 'fixture'], root), 'commit fixture')
  return root
}

function writeFiles(root, files) {
  for (const [name, content] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(root, name)), {recursive: true})
    writeFileSync(path.join(root, name), content)
  }
}

function scan(root, mode) {
  return run('bash', ['audits/checks/d6-scan-personal-data.sh', ...(mode === 'full' ? ['--full-tree'] : [])], root)
}

function withFixture(files, allowlist, body) {
  const root = makeFixture(files, allowlist)
  try {
    body(root)
  } finally {
    rmSync(root, {recursive: true, force: true})
  }
}

function assertPasses(result, context) {
  assert.equal(result.status, 0, `${context}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`)
}

function assertFails(result, pattern, context) {
  assert.equal(result.status, 1, `${context}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`)
  assert.match(result.stdout, pattern, context)
}

const changeset = (frontmatter, body = 'Synthetic release note.\n') => `---\n${frontmatter}\n---\n\n${body}`

test('a stale allowlist entry fails the full-tree scan and the error names it', () => {
  withFixture({'docs/live.md': `${marker}\n`}, `docs/live.md:marker:${marker}\ndocs/deleted.md:marker:${marker}\n`, (root) => {
    const result = scan(root, 'full')
    assertFails(result,
      new RegExp(`ERROR: \\[stale-allowlist-entry\\] audits/lib/scan-allowlist\\.txt: 'docs/deleted\\.md:marker:${marker}' names no tracked file`),
      'stale entry must fail')
    assert.doesNotMatch(result.stdout, /docs\/live\.md/, 'the live entry is not stale')
  })
})

test('an allowlist entry with an unknown check label is reported as stale', () => {
  withFixture({'docs/live.md': 'clean\n'}, 'docs/live.md:emial\n', (root) => {
    assertFails(scan(root, 'full'), /\[stale-allowlist-entry\] .*'docs\/live\.md:emial'/, 'a typo in the label must not hide')
  })
})

test('staged mode fails a commit that deletes an allowlisted file but keeps its entry', () => {
  withFixture({'docs/doomed.md': `${marker}\n`}, `docs/doomed.md:marker:${marker}\n`, (root) => {
    assertPasses(scan(root, 'staged'), 'nothing staged and no stale entry')
    assertSucceeded(run('git', ['rm', '-q', 'docs/doomed.md'], root), 'stage the deletion')
    assertFails(scan(root, 'staged'), /\[stale-allowlist-entry\] .*'docs\/doomed\.md:marker:/, 'a deletion-only commit must still fail')

    // Removing the entry in the working tree is not enough: the commit
    // records the staged allowlist.
    writeFileSync(path.join(root, 'audits/lib/scan-allowlist.txt'), '# Isolated fixture allowlist.\n')
    assertFails(scan(root, 'staged'), /\[stale-allowlist-entry\]/, 'an unstaged allowlist fix must not pass the commit')
    assertSucceeded(run('git', ['add', 'audits/lib/scan-allowlist.txt'], root), 'stage the allowlist fix')
    assertPasses(scan(root, 'staged'), 'the staged allowlist fix passes')
  })
})

test('a changeset whose frontmatter names a scoped package passes with no allowlist entry', () => {
  const files = {
    '.changeset/single.md': changeset(`'${scope}/web': minor`),
    '.changeset/double.md': changeset(`"${scope}/tokens": patch\n'${scope}/copy': major\n'${scope}/schemas': none`)
  }
  withFixture(files, '', (root) => {
    assertPasses(scan(root, 'full'), 'full-tree scan')
    writeFiles(root, {'.changeset/staged.md': changeset(`'${scope}/web': minor`)})
    assertSucceeded(run('git', ['add', '.changeset/staged.md'], root), 'stage a new changeset')
    assertPasses(scan(root, 'staged'), 'staged scan')
  })
})

test('the handle in a changeset body still fails, after an exempt frontmatter line', () => {
  withFixture({'.changeset/body.md': changeset(`'${scope}/web': minor`, `- \`${scope}/web\`: synthetic change.\n`)}, '', (root) => {
    assertFails(scan(root, 'full'), /ERROR: \[marker:[^\]]+\] \.changeset\/body\.md: 5:/, 'body line 5 must be reported')
  })
})

test('the handle outside the narrow changeset rule fails without an entry and passes with one', () => {
  const cases = {
    'docs/release.md': changeset(`'${scope}/web': minor`),
    '.changeset/nested/deep.md': changeset(`'${scope}/web': minor`),
    '.changeset/notes.txt': changeset(`'${scope}/web': minor`),
    '.changeset/bad-type.md': changeset(`'${scope}/web': huge`),
    '.changeset/mixed-quotes.md': changeset(`'${scope}/web": minor`),
    '.changeset/other-key.md': changeset(`'${scope}/web': minor\nauthor: ${marker}`),
    '.changeset/unclosed.md': `---\n'${scope}/web': minor\n`,
    '.changeset/late-block.md': `Intro.\n---\n'${scope}/web': minor\n---\n`,
    '.changeset/body-shaped.md': changeset(`'${scope}/web': minor`, `'${scope}/tokens': patch\n`),
    'docs/plain.txt': `${marker}\n`
  }
  for (const [name, content] of Object.entries(cases)) {
    withFixture({[name]: content}, '', (root) => {
      assertFails(scan(root, 'full'), new RegExp(`ERROR: \\[marker:[^\\]]+\\] ${name.replaceAll('.', '\\.')}:`), `${name} without an entry`)
    })
    withFixture({[name]: content}, `${name}:marker:${marker}\n`, (root) => {
      assertPasses(scan(root, 'full'), `${name} with an entry`)
    })
  }
})

test('staged mode scans the staged content, not the working tree', () => {
  withFixture({'docs/note.md': 'clean\n'}, '', (root) => {
    writeFileSync(path.join(root, 'docs/note.md'), `${marker}\n`)
    assertSucceeded(run('git', ['add', 'docs/note.md'], root), 'stage the marker')
    writeFileSync(path.join(root, 'docs/note.md'), 'clean again\n')
    assertFails(scan(root, 'staged'), /ERROR: \[marker:[^\]]+\] docs\/note\.md: 1:/, 'the staged blob holds the marker')
  })
})

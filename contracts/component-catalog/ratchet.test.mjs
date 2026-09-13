/**
 * Known-answer tests for the conformance ratchet (`ratchet.mjs`, check 4 of the catalog gate).
 *
 * Runs under `pnpm test:scripts` (node --test), beside schema.test.mjs.
 *
 * A ratchet is only worth its file if it can FAIL, so most of these are negative: the synthetic
 * catalogs below each encode one way the gate must red, and every one of them was confirmed to red
 * for the RIGHT reason (the assertions pin the message, not just the count). The positive cases pin
 * the other half — the 31 and 29 already-known gaps must stay quiet, or the gate is noise nobody
 * reads and the first thing anyone does is bypass it.
 *
 * Entries here are MINIMAL — `{widget, a11y, conformance}` only. `evaluateRatchet` reads nothing
 * else, and a fuller fixture would be a hand-written copy of generated values, which is the drift
 * schema.test.mjs's header explains this catalog exists to catch.
 */

import assert from 'node:assert/strict'
import {mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {dirname, join} from 'node:path'
import test from 'node:test'

import {catalogWidgets, REPO_ROOT} from './generate.mjs'
import {
  AXES,
  BASELINE_PATH,
  BASELINE_REL,
  BaselineError,
  collectRaises,
  evaluateFreeze,
  evaluateRatchet,
  FREEZE_ENV,
  FreezeError,
  gapsFromEntries,
  git,
  isFrozen,
  parseRaiseValue,
  RAISE_KEY,
  readBaseline,
  runFreezeCheck,
  writeBaseline
} from './ratchet.mjs'

const scratch = () => mkdtempSync(join(tmpdir(), 'conformance-ratchet-test-'))

/**
 * A widget with a behavioral test and an a11y label — covered on both axes.
 *
 * The test path deliberately omits the consumer repo name a real entry carries. `evaluateRatchet`
 * reads null-versus-not, never the value, and `audits/lib/scan-allowlist.txt` allowlists that marker
 * only where the reference must stay FOLLOWABLE (`BEHAVIORAL_TESTS` and the two real contracts). A
 * fictional path has nothing to follow, so widening the allowlist for one would weaken the scan for
 * no gain.
 */
const covered = (widget) => ({
  widget,
  a11y: {voiceOverLabel: true, ref: `Sources/LifegamesWidgets/Other/${widget}.swift:1`},
  conformance: {behavioralTest: `tests/behavioral/${widget}-matrix.test.ts`}
})

/** A widget with neither — the shape 27 of the 33 real widgets are in today. */
const uncovered = (widget) => ({widget, a11y: {voiceOverLabel: null, ref: null}, conformance: {behavioralTest: null}})

const baselineOf = ({behavioralGap = [], a11yGap = []} = {}) => ({behavioralGap: new Set(behavioralGap), a11yGap: new Set(a11yGap)})

const matching = (failures, needle) => failures.filter((message) => message.includes(needle))

// covers: widget-contract#A widget conformance gap is grandfathered by identity and the grandfathered set cannot grow unjustified
test('a NEW widget with neither axis covered FAILS on both, and names the widget', () => {
  const {failures, prunable} = evaluateRatchet({entries: [uncovered('brand-new-widget')], baseline: baselineOf()})
  assert.equal(failures.length, 2, `expected one failure per axis, got ${JSON.stringify(failures)}`)
  assert.equal(matching(failures, 'no behavioral conformance test').length, 1)
  assert.equal(matching(failures, 'no recorded a11y label').length, 1)
  for (const message of failures) {
    assert.match(message, /brand-new-widget/)
  }
  assert.deepEqual(prunable, [])
})

test('a grandfathered widget PASSES on the axis it is listed under, and only that axis', () => {
  const {failures, prunable} = evaluateRatchet({entries: [uncovered('grandfathered')], baseline: baselineOf({behavioralGap: ['grandfathered']})})
  assert.equal(failures.length, 1, `only the ungrandfathered a11y axis should fail, got ${JSON.stringify(failures)}`)
  assert.match(failures[0], /no recorded a11y label/)
  assert.deepEqual(prunable, [])
})

test('a fully grandfathered widget is silent — the known debt does not red the gate', () => {
  const {failures, prunable} = evaluateRatchet({
    entries: [uncovered('grandfathered')],
    baseline: baselineOf({behavioralGap: ['grandfathered'], a11yGap: ['grandfathered']})
  })
  assert.deepEqual(failures, [])
  assert.deepEqual(prunable, [])
})

test('a REGRESSION — a covered widget losing coverage — FAILS even though the catalog stays valid', () => {
  // This is the failure check 1-3 cannot see. The entry is still grammatical and still complete; the
  // only thing wrong is that a populated field went back to null, and before the ratchet the widget
  // simply rejoined the 27 with nothing said.
  const regressed = {...covered('bookshelf'), conformance: {behavioralTest: null}}
  const {failures} = evaluateRatchet({entries: [regressed], baseline: baselineOf()})
  assert.equal(failures.length, 1)
  assert.match(failures[0], /bookshelf: no behavioral conformance test/)
})

test('a graduated widget whose id is still in the baseline is PRUNABLE, and prunable never blocks', () => {
  const {failures, prunable} = evaluateRatchet({
    entries: [covered('graduated')],
    baseline: baselineOf({behavioralGap: ['graduated'], a11yGap: ['graduated']})
  })
  assert.deepEqual(failures, [], 'closing a gap must never red the PR that closes it')
  assert.equal(prunable.length, 2)
  assert.equal(matching(prunable, 'behavioralGap: `graduated`').length, 1)
  assert.equal(matching(prunable, 'a11yGap: `graduated`').length, 1)
  for (const notice of prunable) {
    assert.match(notice, /prune its id .* in THIS PR/)
  }
})

test('a baseline id naming no widget in the catalog FAILS — a stale grandfathering reads as covered', () => {
  const {failures} = evaluateRatchet({
    entries: [covered('still-here')],
    baseline: baselineOf({behavioralGap: ['deleted-widget'], a11yGap: ['deleted-widget']})
  })
  assert.equal(failures.length, 2, `expected one stale failure per axis, got ${JSON.stringify(failures)}`)
  for (const message of failures) {
    assert.match(message, /lists `deleted-widget`, which is not a widget in the catalog/)
  }
})

test('a MISSING baseline throws BaselineError — never an empty set, never a pass', () => {
  const dir = scratch()
  try {
    assert.throws(() => readBaseline(join(dir, 'nope.json')), (error) => {
      assert.ok(error instanceof BaselineError)
      assert.match(error.message, /not found\. Generate it once with/)
      return true
    })
  } finally {
    rmSync(dir, {recursive: true, force: true})
  }
})

test('an unparseable or malformed baseline throws BaselineError rather than degrading to a pass', () => {
  const dir = scratch()
  const path = join(dir, 'conformance-baseline.json')
  const cases = [
    ['{not json', /not valid JSON/],
    ['[]', /expected an object with `behavioralGap` and `a11yGap` arrays/],
    ['null', /expected an object with `behavioralGap` and `a11yGap` arrays/],
    ['{"behavioralGap": []}', /`a11yGap` must be an array of non-empty widget ids/],
    ['{"behavioralGap": "x", "a11yGap": []}', /`behavioralGap` must be an array of non-empty widget ids/],
    ['{"behavioralGap": [1], "a11yGap": []}', /`behavioralGap` must be an array of non-empty widget ids/],
    ['{"behavioralGap": [""], "a11yGap": []}', /`behavioralGap` must be an array of non-empty widget ids/],
    ['{"behavioralGap": ["a", "a"], "a11yGap": []}', /`behavioralGap` contains duplicate ids/]
  ]
  try {
    for (const [bytes, expected] of cases) {
      writeFileSync(path, bytes)
      assert.throws(() => readBaseline(path), (error) => {
        assert.ok(error instanceof BaselineError, `expected BaselineError for ${bytes}, got ${error?.name}`)
        assert.match(error.message, expected)
        return true
      }, `no BaselineError for ${bytes}`)
    }
  } finally {
    rmSync(dir, {recursive: true, force: true})
  }
})

test('gapsFromEntries records exactly the null-field ids, sorted', () => {
  const gaps = gapsFromEntries([covered('zeta'), uncovered('beta'), uncovered('alpha'), {...covered('mid'), a11y: {voiceOverLabel: null, ref: null}}])
  assert.deepEqual(gaps.behavioralGap, ['alpha', 'beta'])
  assert.deepEqual(gaps.a11yGap, ['alpha', 'beta', 'mid'])
})

test('writeBaseline round-trips through readBaseline and is byte-idempotent', async () => {
  const dir = scratch()
  const path = join(dir, 'conformance-baseline.json')
  try {
    const written = await writeBaseline([uncovered('beta'), uncovered('alpha'), covered('gamma')], path)
    assert.deepEqual(written.behavioralGap, ['alpha', 'beta'])
    const first = readFileSync(path, 'utf8')
    const parsed = readBaseline(path)
    assert.deepEqual([...parsed.behavioralGap].sort(), ['alpha', 'beta'])
    assert.deepEqual([...parsed.a11yGap].sort(), ['alpha', 'beta'])
    // The artifact carries its own instructions: a reader who finds it in a diff learns the rule
    // without opening ratchet.mjs.
    const payload = JSON.parse(first)
    assert.match(payload.description, /Grandfathered baseline/)
    assert.equal(payload.generatedBy, 'node contracts/component-catalog/check.mjs --update-baseline')
    await writeBaseline([covered('gamma'), uncovered('alpha'), uncovered('beta')], path)
    assert.equal(readFileSync(path, 'utf8'), first, 'a re-record from the same set must be byte-identical')
  } finally {
    rmSync(dir, {recursive: true, force: true})
  }
})

// ── The committed baseline, bound to the real catalog ────────────────────────
//
// The tests above run on synthetic catalogs, which is what makes their answers known. These two bind
// the committed artifact to reality, so a baseline that drifted from the widget set fails here and
// not only in the gate.

const realEntries = catalogWidgets().map((widget) =>
  JSON.parse(readFileSync(join(REPO_ROOT, `contracts/component-catalog/catalog/${widget}.contract.json`), 'utf8'))
)

test('the committed baseline names only real widgets and grandfathers exactly the current gaps', () => {
  const baseline = readBaseline(BASELINE_PATH)
  const ids = new Set(realEntries.map((entry) => entry.widget))
  const gaps = gapsFromEntries(realEntries)
  for (const {key} of AXES) {
    for (const id of baseline[key]) {
      assert.ok(ids.has(id), `${key} grandfathers \`${id}\`, which is not a widget in the catalog`)
    }
    assert.deepEqual([...baseline[key]].sort(), gaps[key], `${key} has drifted — re-record with \`--update-baseline\``)
  }
})

test('the real catalog passes the ratchet, and reds the moment one widget loses coverage', () => {
  const baseline = readBaseline(BASELINE_PATH)
  assert.deepEqual(evaluateRatchet({entries: realEntries, baseline}).failures, [])

  // CAN-FAIL PROOF against the real catalog, not a synthetic one: take the one widget that has a
  // behavioral test and is therefore NOT grandfathered, drop its test, and the gate must red. If
  // this assertion ever passes vacuously the ratchet has stopped ratcheting.
  const graduated = realEntries.find((entry) => entry.conformance.behavioralTest !== null)
  assert.ok(graduated, 'no widget has a behavioral test — the can-fail proof would pass vacuously')
  const mutant = realEntries.map((entry) => entry.widget === graduated.widget ? {...entry, conformance: {behavioralTest: null}} : entry)
  const {failures} = evaluateRatchet({entries: mutant, baseline})
  assert.equal(failures.length, 1)
  assert.match(failures[0], new RegExp(`^${graduated.widget}: no behavioral conformance test`))
})

// ── THE FREEZE ───────────────────────────────────────────────────────────────
//
// The three arms above all read the CATALOG against the baseline, so every one of them is satisfied
// by whatever the baseline happens to list. That was the hole (atlas decision 0102 move 1b): add an
// untested widget, run `--update-baseline`, and the new gap is absorbed into the grandfathering with
// every check green. These tests hold the fourth arm to the three answers that matter — an absorb
// REDS, a genuine closure PASSES, and a named justified raise PASSES — and they drive it through a
// REAL throwaway git repository rather than a stub, because the arm's whole job is reading a prior
// revision out of git and half of what can go wrong lives in that read.

/**
 * A throwaway repository with a `main` branch, isolated from the user's hooks and signing config.
 *
 * Driven through the ratchet's OWN `git()` rather than a private `spawnSync`, which makes these
 * tests the exercise for its `GIT_DIR` stripping: git exports `GIT_DIR` to every hook it runs, and
 * `pnpm test:scripts` runs from `.husky/pre-push`, so an unstripped helper silently operates on the
 * real repository here no matter what `cwd` says. That is exactly how this suite first went red.
 */
const gitRepo = () => {
  const dir = mkdtempSync(join(tmpdir(), 'conformance-freeze-test-'))
  const run = (...args) => {
    const result = git(args, dir)
    assert.ok(result.ok, `git ${args.join(' ')} failed — ${result.stderr}`)
    return result.stdout
  }
  run('init', '--quiet', '--initial-branch=main')
  // INTERLOCK, before anything destructive. These tests commit, branch and `branch -D`, so a helper
  // that ever addressed the wrong repository would rewrite a real one — which is precisely what
  // happened before `git()` stripped GIT_DIR. Prove ownership first: the git directory this repo
  // resolves to must live under the temp directory we just made, or nothing else runs.
  const owned = run('rev-parse', '--absolute-git-dir')
  assert.ok(owned.startsWith(realpathSync(dir)), `fixture resolved to ${owned}, which is outside its own temp dir ${dir}`)
  run('config', 'user.email', 'gate@example.invalid')
  run('config', 'user.name', 'Conformance Gate Test')
  // A globally configured hooks path (husky) or commit signing would make these commits fail for
  // reasons that have nothing to do with the ratchet.
  run('config', 'core.hooksPath', join(dir, 'no-hooks'))
  run('config', 'commit.gpgsign', 'false')
  run('commit', '--quiet', '--allow-empty', '-m', 'root')
  mkdirSync(dirname(join(dir, BASELINE_REL)), {recursive: true})
  return {dir, run}
}

/**
 * Record a baseline from `entries` through the REAL writer and commit it. Using `writeBaseline` and
 * not a hand-written JSON literal is the point of these tests: the absorb they have to catch is
 * exactly what `check.mjs --update-baseline` writes.
 */
const commitBaseline = async ({dir, run}, entries, message) => {
  await writeBaseline(entries, join(dir, BASELINE_REL))
  run('add', BASELINE_REL)
  run('commit', '--quiet', '-m', message)
  return run('rev-parse', 'HEAD')
}

/** The freeze as `check.mjs` runs it, against a throwaway repo, with an env that leaks nothing. */
// The base is passed as an EXPLICIT OPTION, never through CATALOG_BASELINE_BASE. That env var was a
// reachable thaw switch: it takes a verbatim commit-ish with no merge-base, so pointing it at HEAD
// compared the baseline against itself and the freeze printed `ok` while checking nothing. It now
// rejects HEAD and any descendant of it, and the suite injects through the option instead — a
// test-only escape hatch that ships in the shipped code is not test-only.
const freezeIn = ({dir}, {base = null, ...env} = {}) =>
  runFreezeCheck({baseline: readBaseline(join(dir, BASELINE_REL)), env: {[FREEZE_ENV.frozen]: '1', ...env}, cwd: dir, base})

const withRepo = async (body) => {
  const repo = gitRepo()
  try {
    await body(repo)
  } finally {
    rmSync(repo.dir, {recursive: true, force: true})
  }
}

/** The state the real repo is in: two widgets carrying debt, one covered. */
const BASE_CATALOG = [uncovered('alpha'), uncovered('beta'), covered('gamma')]

test('PROOF OF FAIL — `--update-baseline` absorbing a NEW widget REDS while frozen', async () => {
  await withRepo(async (repo) => {
    const base = await commitBaseline(repo, BASE_CATALOG, 'chore: seed the baseline')

    // The exact attack: a new widget lands with neither axis covered, and the author silences check 4
    // by re-recording. Check 4 goes green — the id it complained about is now grandfathered.
    const absorbed = [...BASE_CATALOG, uncovered('delta')]
    await commitBaseline(repo, absorbed, 'feat: add the delta widget')
    assert.deepEqual(evaluateRatchet({entries: absorbed, baseline: readBaseline(join(repo.dir, BASELINE_REL))}).failures, [],
      'the absorb must genuinely satisfy check 4 — otherwise this test proves nothing about the freeze')

    const {frozen, failures} = freezeIn(repo, {base})
    assert.equal(frozen, true)
    assert.equal(failures.length, 2, `expected one failure per axis, got ${JSON.stringify(failures)}`)
    for (const message of failures) {
      assert.match(message, /`delta` is grandfathered here but was NOT at/)
      assert.match(message, /cannot absorb a new/)
      assert.match(message, new RegExp(`${RAISE_KEY}: (behavioralGap|a11yGap):delta <reason>`))
    }
    assert.equal(failures.filter((message) => message.includes('`behavioralGap` grew')).length, 1)
    assert.equal(failures.filter((message) => message.includes('`a11yGap` grew')).length, 1)
  })
})

test('a genuine gap CLOSURE shrinks the set and PASSES — the freeze never blocks progress', async () => {
  await withRepo(async (repo) => {
    const base = await commitBaseline(repo, BASE_CATALOG, 'chore: seed the baseline')
    await commitBaseline(repo, [uncovered('alpha'), covered('beta'), covered('gamma')], 'test: cover the beta widget')

    const {failures, notes} = freezeIn(repo, {base})
    assert.deepEqual(failures, [], 'closing a gap must never red the PR that closes it')
    assert.equal(notes.filter((note) => note.includes('shrank by 1') && note.includes('beta')).length, 2)
  })
})

test('an explicit justified raise in a commit trailer PASSES, and the reason is reported', async () => {
  await withRepo(async (repo) => {
    const base = await commitBaseline(repo, BASE_CATALOG, 'chore: seed the baseline')
    const reason = 'the consumer render test needs a device runner that does not exist yet'
    await writeBaseline([...BASE_CATALOG, uncovered('delta')], join(repo.dir, BASELINE_REL))
    repo.run('add', BASELINE_REL)
    repo.run('commit', '--quiet', '-m', `feat: add the delta widget\n\n${RAISE_KEY}: behavioralGap:delta ${reason}\n${RAISE_KEY}: a11yGap:delta ${reason}`)

    const {failures, notes} = freezeIn(repo, {base})
    assert.deepEqual(failures, [], `a named, justified raise must pass, got ${JSON.stringify(failures)}`)
    assert.equal(notes.length, 2)
    for (const note of notes) {
      assert.match(note, new RegExp(`raised via ${RAISE_KEY} trailer`))
      assert.ok(note.includes(reason), `the reason must reach the log so a reviewer reads it — got ${note}`)
    }
  })
})

test('a raise naming the wrong axis or the wrong widget does NOT unlock the growth it does not name', async () => {
  await withRepo(async (repo) => {
    const base = await commitBaseline(repo, BASE_CATALOG, 'chore: seed the baseline')
    await writeBaseline([...BASE_CATALOG, uncovered('delta')], join(repo.dir, BASELINE_REL))
    repo.run('add', BASELINE_REL)
    repo.run('commit', '--quiet', '-m',
      `feat: add delta\n\n${RAISE_KEY}: behavioralGap:epsilon wrong widget\n${RAISE_KEY}: a11yGap:delta genuinely unavoidable`)

    const {failures, notes} = freezeIn(repo, {base})
    assert.equal(failures.length, 1, `only the unnamed behavioral growth should fail, got ${JSON.stringify(failures)}`)
    assert.match(failures[0], /`behavioralGap` grew: `delta`/)
    assert.equal(notes.filter((note) => note.includes('matches no new gap')).length, 1, 'the misdirected raise must be reported as dead weight')
  })
})

test('a raise with no reason is REJECTED, and the growth it tried to cover still FAILS', async () => {
  await withRepo(async (repo) => {
    const base = await commitBaseline(repo, BASE_CATALOG, 'chore: seed the baseline')
    await writeBaseline([...BASE_CATALOG, uncovered('delta')], join(repo.dir, BASELINE_REL))
    repo.run('add', BASELINE_REL)
    repo.run('commit', '--quiet', '-m', `feat: add delta\n\n${RAISE_KEY}: behavioralGap:delta\n${RAISE_KEY}: a11yGap:delta`)

    const {failures} = freezeIn(repo, {base})
    assert.equal(failures.filter((message) => message.includes('with no reason')).length, 2)
    assert.equal(failures.filter((message) => message.includes('grew: `delta`')).length, 2)
  })
})

test('the env carrier raises the same way the trailer does — the local loop is not a second grammar', async () => {
  await withRepo(async (repo) => {
    const base = await commitBaseline(repo, BASE_CATALOG, 'chore: seed the baseline')
    await commitBaseline(repo, [...BASE_CATALOG, uncovered('delta')], 'feat: add delta')

    const env = {base, [FREEZE_ENV.raise]: 'behavioralGap:delta needs a device runner\na11yGap:delta shares a props type'}
    assert.deepEqual(freezeIn(repo, env).failures, [])
    // And the bare-value form and the full-trailer form are the same value.
    const prefixed = {...env, [FREEZE_ENV.raise]: `${RAISE_KEY}: behavioralGap:delta reason one;${RAISE_KEY}: a11yGap:delta reason two`}
    assert.deepEqual(freezeIn(repo, prefixed).failures, [])
  })
})

test('an unnamed ref is resolved through merge-base, so a branch is judged only on what IT added', async () => {
  await withRepo(async (repo) => {
    await commitBaseline(repo, BASE_CATALOG, 'chore: seed the baseline')
    repo.run('checkout', '--quiet', '-b', 'feature')
    await commitBaseline(repo, [...BASE_CATALOG, uncovered('delta')], 'feat: add delta')

    // `main` moves on AFTER the fork with a raise of its own. Comparing against the tip would blame
    // this branch for `epsilon`; comparing against the merge base does not.
    repo.run('checkout', '--quiet', 'main')
    await commitBaseline(repo, [...BASE_CATALOG, uncovered('epsilon')], 'feat: add epsilon on main')
    repo.run('checkout', '--quiet', 'feature')

    const {describe, failures} = freezeIn(repo)
    assert.match(describe, /the merge base with main/)
    assert.equal(failures.length, 2, `only delta is this branch's growth, got ${JSON.stringify(failures)}`)
    for (const message of failures) {
      assert.match(message, /grew: `delta`/)
    }
  })
})

test('CATALOG_BASELINE_BASE cannot be pointed at HEAD to green a growth — the one reachable thaw switch', async () => {
  // REGRESSION. `CATALOG_BASELINE_BASE` takes a VERBATIM commit-ish with no merge-base, so setting
  // it to HEAD compared the baseline against itself: every growth set came out empty and the check
  // printed `ok baseline freeze (frozen against CATALOG_BASELINE_BASE HEAD (…))`. Measured on a
  // branch that reds without it, the whole gate went PASS 6/6 exit 0. The switch reported itself as
  // frozen while being a thaw, which is the worst version of this bug: the run LOOKS gated.
  await withRepo(async (repo) => {
    await commitBaseline(repo, BASE_CATALOG, 'chore: seed the baseline')
    repo.run('checkout', '--quiet', '-b', 'feature')
    await commitBaseline(repo, [...BASE_CATALOG, uncovered('delta')], 'feat: add delta with neither test nor label')

    // The growth is real: with the base resolved honestly, the freeze reds.
    assert.ok(freezeIn(repo).failures.length > 0, 'precondition: this branch grows the baseline and must red')

    // And the switch can no longer make it green. HEAD, and a descendant of HEAD, both throw.
    for (const override of ['HEAD', repo.run('rev-parse', 'HEAD')]) {
      assert.throws(
        () =>
          runFreezeCheck({
            baseline: readBaseline(join(repo.dir, BASELINE_REL)),
            env: {[FREEZE_ENV.frozen]: '1', [FREEZE_ENV.base]: override},
            cwd: repo.dir
          }),
        (error) => {
          assert.ok(error instanceof FreezeError)
          assert.match(error.message, /HEAD or a descendant of it/)
          return true
        },
        `${FREEZE_ENV.base}=${override} must be rejected, not honoured`
      )
    }

    // A genuine ancestor is still accepted — the rejection is aimed at the vacuous comparison, not
    // at the CI provider that hands over a real base sha.
    const ancestor = repo.run('rev-parse', 'HEAD~1')
    const honoured = runFreezeCheck({
      baseline: readBaseline(join(repo.dir, BASELINE_REL)),
      env: {[FREEZE_ENV.frozen]: '1', [FREEZE_ENV.base]: ancestor},
      cwd: repo.dir
    })
    assert.ok(honoured.failures.length > 0, 'a real ancestor base must still see the growth and red')
  })
})

test('a base that cannot be resolved is a FreezeError, never a silent skip', async () => {
  await withRepo(async (repo) => {
    await commitBaseline(repo, BASE_CATALOG, 'chore: seed the baseline')
    assert.throws(() => freezeIn(repo, {base: 'no-such-revision'}), (error) => {
      assert.ok(error instanceof FreezeError)
      assert.match(error.message, /does not resolve to a commit/)
      return true
    })

    // No override, and no candidate branch either — the arm must say so rather than pass.
    repo.run('checkout', '--quiet', '-b', 'orphan')
    repo.run('branch', '--quiet', '-D', 'main')
    assert.throws(() => freezeIn(repo), (error) => {
      assert.ok(error instanceof FreezeError)
      assert.match(error.message, /no base revision could be resolved/)
      assert.match(error.message, /fetch-depth: 0/)
      return true
    })
  })
})

test('a baseline absent at the base makes every id a raise, rather than an empty set that passes', async () => {
  await withRepo(async (repo) => {
    const base = repo.run('rev-parse', 'HEAD') // the root commit, before any baseline exists
    await commitBaseline(repo, BASE_CATALOG, 'chore: seed the baseline')

    const {failures, notes} = freezeIn(repo, {base})
    assert.equal(failures.length, 4, `alpha and beta on both axes, got ${JSON.stringify(failures)}`)
    assert.match(notes[0], /does not exist at/)
  })
})

test('git() reads the repository at cwd even when GIT_DIR points somewhere else', async () => {
  // REGRESSION. Git exports GIT_DIR to every hook it runs, and `.husky/pre-push` runs both the gate
  // and `pnpm test:scripts` — so the inherited value outranked `cwd` and every throwaway repo below
  // silently resolved to THIS repository. The gate still passed under the hook, which is the part
  // that made it dangerous: it was reading the right repo by luck, not by construction.
  await withRepo(async (repo) => {
    const head = await commitBaseline(repo, BASE_CATALOG, 'chore: seed the baseline')
    const previous = process.env.GIT_DIR
    process.env.GIT_DIR = join(REPO_ROOT, '.git')
    try {
      assert.equal(git(['rev-parse', 'HEAD'], repo.dir).stdout, head, 'cwd must decide which repository git reads')
      assert.deepEqual(freezeIn(repo, {base: head}).failures, [])
    } finally {
      if (previous === undefined) {
        delete process.env.GIT_DIR
      } else {
        process.env.GIT_DIR = previous
      }
    }
  })
})

test('the freeze is OFF by default and ON under CI — the merge gate is where it has to bind', () => {
  assert.equal(isFrozen({}), false)
  assert.equal(isFrozen({CI: ''}), false)
  assert.equal(isFrozen({CI: '0'}), false)
  assert.equal(isFrozen({CI: 'false'}), false)
  assert.equal(isFrozen({CI: 'true'}), true)
  assert.equal(isFrozen({CI: '1'}), true)
  assert.equal(isFrozen({[FREEZE_ENV.frozen]: '1'}), true)
  // There is deliberately no thaw: a value that turns the freeze off would be the bypass it exists
  // to remove.
  assert.equal(isFrozen({CI: '1', [FREEZE_ENV.frozen]: '0'}), true)
})

test('an unfrozen run reports itself as unfrozen instead of quietly reporting a pass', () => {
  const outcome = runFreezeCheck({baseline: {behavioralGap: new Set(), a11yGap: new Set()}, env: {}, cwd: REPO_ROOT})
  assert.equal(outcome.frozen, false)
  assert.match(outcome.describe, /not frozen/)
  assert.deepEqual(outcome.failures, [])
})

test('parseRaiseValue holds the raise grammar — axis, id, and a reason that is not optional', () => {
  assert.deepEqual(parseRaiseValue('behavioralGap:delta needs a device runner'), {axis: 'behavioralGap', id: 'delta', reason: 'needs a device runner'})
  assert.deepEqual(parseRaiseValue('a11yGap:place-leaderboard-v3 — shares a props type'), {
    axis: 'a11yGap',
    id: 'place-leaderboard-v3',
    reason: 'shares a props type'
  })
  assert.match(parseRaiseValue('').error, /empty raise/)
  assert.match(parseRaiseValue('behavioralGap:delta').error, /with no reason/)
  assert.match(parseRaiseValue('behavioralGap:delta   ').error, /with no reason/)
  assert.match(parseRaiseValue('everything:delta all of it').error, /which is not one of/)
  assert.match(parseRaiseValue('behavioralGap').error, /is not a raise/)
})

test('collectRaises reads trailers out of a whole commit range and names the carrier of each', () => {
  const messages = [
    'feat: add delta',
    '',
    `${RAISE_KEY}: behavioralGap:delta no device runner`,
    '',
    'chore: unrelated commit that mentions Baseline-Raise in prose but not as a trailer',
    '',
    `  ${RAISE_KEY} : a11yGap:delta shares a props type  `
  ].join('\n')
  const {raises, errors} = collectRaises({env: {}, messages})
  assert.deepEqual(errors, [])
  assert.deepEqual(raises.map(({axis, id, carrier}) => `${carrier}|${axis}:${id}`), [
    `${RAISE_KEY} trailer|behavioralGap:delta`,
    `${RAISE_KEY} trailer|a11yGap:delta`
  ])
  assert.equal(collectRaises({env: {[FREEZE_ENV.raise]: 'a11yGap:delta a reason'}, messages: ''}).raises[0].carrier, FREEZE_ENV.raise)
})

test('evaluateFreeze compares by IDENTITY, so a swap that keeps the count reds', () => {
  // A numeric budget passes this: one gap closed, one opened, total unchanged. That re-seeding is
  // betterer's known defect and the reason the estate's baselines are identity-keyed.
  const base = {behavioralGap: new Set(['alpha']), a11yGap: new Set()}
  const baseline = {behavioralGap: new Set(['beta']), a11yGap: new Set()}
  const {failures, notes} = evaluateFreeze({baseline, base})
  assert.equal(failures.length, 1)
  assert.match(failures[0], /grew: `beta`/)
  assert.equal(notes.filter((note) => note.includes('shrank by 1')).length, 1)
})

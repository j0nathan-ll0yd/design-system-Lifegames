#!/usr/bin/env node
// mantle-cli-output: package version-drift report for stdout
/**
 * Package version-drift check — "did the payload change without a version bump?"
 *
 * THE FAILURE THIS EXISTS TO CATCH
 * --------------------------------
 * An agent edits source inside a published package, merges, and never bumps the
 * version. Consumers silently never receive the change. Nothing goes red today:
 * typecheck, tests, lint and the PR all pass, and `changeset publish` SILENTLY
 * SKIPS any version already present in the registry and exits 0. The drift is
 * invisible until someone diffs the tarball against the tree.
 *
 * THE RULE
 * --------
 * For each published package under `packages/`:
 *
 *   STEP 1 — find S, the commit that made the CURRENT declared version true.
 *            Walk `git rev-list --first-parent <head> -- <pkgDir>/package.json`
 *            newest-first, take the leading contiguous streak of commits whose
 *            manifest `version` equals the declared version, and use the OLDEST
 *            commit still inside that streak.
 *   STEP 2 — diff the package tree between S and head (a TWO-POINT tree diff,
 *            `git diff S <head> -- <pkgDir>`), not a commit-range walk.
 *   STEP 3 — classify each changed path: does it end up inside the published
 *            tarball, or is it a build input for something that does?
 *            Any surviving path is DRIFT.
 *
 * Why streak-from-HEAD and not `git log -S'"version": "1.0.0"'`: the pickaxe
 * matches BOTH the commit that ADDED a version string and the commit that
 * REMOVED it, and after a revert it returns the ORIGINAL commit rather than the
 * revert. The streak returns the revert — the commit that made the *current*
 * declaration true. Ditto `--follow` (single-file, heuristic, version-dependent).
 *
 * Why a two-point tree diff and not a range walk: same-commit bumps, reverts,
 * merges and cherry-picks all fall out correctly with zero special cases. A
 * range walk reports a change and its own revert as two findings.
 *
 * BASE-REF INDEPENDENCE
 * ---------------------
 * S is derived per-package from the manifest's own history, so this produces the
 * same verdicts in CI, in a pre-push hook, in a detached worktree and in an agent
 * shell. `origin/main` is never consulted. `--base` is an optional REPORT FILTER
 * (see below); it never moves S and never changes which paths count.
 *
 * DS HAS TWO VERSIONING SYSTEMS — BOTH ARE COVERED
 * ------------------------------------------------
 *   * @j0nathan-ll0yd/config is hand-bumped and published by
 *     .github/workflows/publish-config.yml ("Bump the `version` field in
 *     packages/config/package.json before triggering").
 *   * copy / fixtures / schemas / tokens / web are published by
 *     .github/workflows/publish-ds-packages.yml via `changeset publish`
 *     ("Set each package's `version` before triggering").
 *
 * Neither distinction reaches this check: the rule reads only the manifest's own
 * `version` history, so it is agnostic to WHO wrote the bump. It is equally
 * correct for a hand-edit, for a `changeset version` commit that lands the bump
 * separately from the source change (S becomes the version commit; the source
 * change is strictly before S and therefore outside the diff), and for a bump
 * committed alongside its source change (S is that very commit, and the
 * two-point diff S..head excludes S's own changes).
 *
 * WORKING TREE IS IGNORED BY DESIGN
 * ---------------------------------
 * Both the declared version and the right-hand side of the diff are read from
 * the head REF. An uncommitted bump is invisible on purpose, so CI and local
 * never disagree. A pre-push hook must therefore run AFTER the bump is
 * committed — the failure message says so.
 *
 * Usage:
 *   node scripts/check-package-drift.mjs                # full inventory, blocking
 *   node scripts/check-package-drift.mjs --json         # machine-readable, same exit codes
 *   node scripts/check-package-drift.mjs --head <ref>   # default HEAD
 *   node scripts/check-package-drift.mjs --base <ref>   # report-filter: only drift the
 *                                                       # commits under review introduced
 *   node scripts/check-package-drift.mjs --self-test    # known-answer vectors, exit 0
 *
 * Exit codes:
 *   0  no DRIFT and no INDETERMINATE
 *   1  at least one DRIFT
 *   2  at least one INDETERMINATE (e.g. shallow clone) and no DRIFT
 */

import assert from 'node:assert/strict'
import {readdirSync, readFileSync} from 'node:fs'
import path from 'node:path'
import {spawnSync} from 'node:child_process'

const ROOT = path.resolve(import.meta.dirname, '..')
const SCOPE = '@j0nathan-ll0yd/'
const GITHUB_PACKAGES_REGISTRY = 'https://npm.pkg.github.com'

/**
 * npm never packs these, whatever `files` says. Suppressing them is what keeps
 * the deletion of packages/tokens/.yalc-content-hash (the yalc retirement) from
 * being reported as drift.
 */
export const ALWAYS_EXCLUDED = [
  'node_modules',
  '.git',
  '.npmrc',
  '.gitignore',
  '.npmignore',
  '.DS_Store',
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'pnpm-workspace.yaml',
  '.yalc-content-hash',
  '.turbo'
]

/** npm's always-pack set, package ROOT only. Case-insensitive, because npm is. */
export const ALWAYS_INCLUDED_RX = [/^package\.json$/i, /^readme(\..+)?$/i, /^licen[sc]e(\..+)?$/i]

/** Inputs whose edit changes a built artifact that IS published. */
export const DERIVED_SOURCE = [
  'src',
  'build.config.ts',
  'build.config.js',
  'build.config.mjs',
  'tsup.config.ts',
  'rollup.config.js',
  'rollup.config.mjs',
  'tsconfig.json',
  'tsconfig.build.json'
]

/** Never a build input for a published artifact, so never drift via the derived tier. */
export const NEVER_DERIVED = [
  'test',
  'tests',
  '__tests__',
  'stories',
  'docs',
  'CHANGELOG.md',
  'vitest.config.ts',
  'vitest.config.js',
  'jest.config.js',
  'playwright.config.ts',
  'eslint.config.js',
  'eslint.config.mjs',
  '.eslintrc.js',
  '.eslintrc.cjs',
  'typedoc.json',
  'overlays',
  '**/*.test.ts',
  '**/*.test.tsx',
  '**/*.spec.ts'
]

/** Thrown for a `files` entry this checker refuses to guess at. */
export class UnsupportedFilesPatternError extends Error {
  constructor(pattern) {
    super(`unsupported-files-pattern: ${pattern} — brace expansion is not supported; spell the entries out`)
    this.name = 'UnsupportedFilesPatternError'
    this.pattern = pattern
  }
}

const GLOB_META = /[*?[\]{}:]/

function normalizePattern(pattern) {
  let body = pattern
  let negated = false
  if (body.startsWith('!')) {
    negated = true
    body = body.slice(1)
  }
  if (body.startsWith('./')) {
    body = body.slice(2)
  }
  while (body.endsWith('/')) {
    body = body.slice(0, -1)
  }
  if (body.includes('{') || body.includes('}')) {
    throw new UnsupportedFilesPatternError(pattern)
  }
  return {negated, body}
}

function globToRegExp(body) {
  let out = ''
  for (let i = 0; i < body.length; i++) {
    const ch = body[i]
    if (ch === '*') {
      if (body[i + 1] === '*') {
        out += '.*'
        i++
      } else {
        out += '[^/]*'
      }
    } else if (ch === '?') {
      out += '[^/]'
    } else if ('.+^$()|[]\\'.includes(ch)) {
      out += `\\${ch}`
    } else {
      out += ch
    }
  }
  // The trailing `(/.*)?` is what makes a directory-shaped glob recursive.
  return new RegExp(`^${out}(/.*)?$`)
}

/**
 * Package-root-ANCHORED, case-sensitive, POSIX-separated glob match.
 *
 * A pattern with no metacharacter is the common case in this estate and is
 * deliberately handled without a regex: `dist` matches `dist` AND `dist/**`,
 * while `scripts/validate.ts` matches EXACTLY that file and NOT
 * `scripts/check-freshness.sh`. Anchoring is why `dist` does not match
 * `__tests__/golden/dist/x.css` (the tokens trap).
 *
 * A leading `!` is stripped here; polarity is resolved by matchesFilesList.
 */
export function matchPattern(pattern, rel) {
  const {body} = normalizePattern(pattern)
  if (!GLOB_META.test(body)) {
    return rel === body || rel.startsWith(`${body}/`)
  }
  return globToRegExp(body).test(rel)
}

/** Evaluates every pattern in declaration order; LAST match wins (npm negation semantics). */
export function matchesFilesList(files, rel) {
  let result = false
  for (const pattern of files) {
    if (matchPattern(pattern, rel)) {
      result = !normalizePattern(pattern).negated
    }
  }
  return result
}

/**
 * FN 1 — locate the commit that made `declaredVersion` the current declaration.
 *
 * `manifestHistory` is NEWEST-FIRST, one entry per commit that changed the
 * package manifest: {sha, version|null, introducedHere?}. `introducedHere` is
 * meaningful only on the OLDEST entry.
 *
 * Pure and total: no git, no fs, no network.
 */
export function selectVersionSettingCommit(declaredVersion, manifestHistory, historyComplete) {
  const n = manifestHistory.length
  if (n === 0) {
    return {sha: null, status: 'no-history'}
  }
  let k = -1
  for (let i = 0; i < n; i++) {
    if (manifestHistory[i].version === declaredVersion) {
      k = i
    } else {
      break
    }
  }
  if (k === -1) {
    // Unreachable when declaredVersion is read from the head ref; kept so the
    // function stays total for the self-test and for any future caller.
    return {sha: null, status: 'no-history'}
  }
  if (k < n - 1) {
    // The streak ended inside observable history: entry k+1 declares a DIFFERENT
    // version, so entry k is exactly where the version became declaredVersion.
    return {sha: manifestHistory[k].sha, status: 'found'}
  }
  if (manifestHistory[k].introducedHere === true) {
    return {sha: manifestHistory[k].sha, status: 'introduced'}
  }
  if (historyComplete === false) {
    return {sha: null, status: 'truncated'}
  }
  return {sha: manifestHistory[k].sha, status: 'introduced'}
}

/**
 * Does this changed path affect the published tarball?
 *
 * The ORDER IS LOAD-BEARING:
 *   - ALWAYS_EXCLUDED beats everything (npm never packs node_modules, even if
 *     `files` names it).
 *   - An EXPLICIT `files` entry beats NEVER_DERIVED (a package that lists
 *     CHANGELOG.md in files[] genuinely publishes it).
 *   - The derived tier only engages when at least one `files` pattern has no
 *     tracked match, i.e. the payload is BUILT rather than committed.
 */
export function classifyChangedPath(rel, files, hasUnbuiltPattern) {
  if (ALWAYS_EXCLUDED.some((p) => matchPattern(p, rel))) {
    return null
  }
  if (files !== null && matchesFilesList(files, rel)) {
    return 'files'
  }
  if (ALWAYS_INCLUDED_RX.some((rx) => rx.test(rel))) {
    return 'always-included'
  }
  if (files === null) {
    // No files[] at all: npm packs almost everything, so almost everything is
    // drift. Deliberately noisy-but-correct.
    return 'no-files-field'
  }
  if (hasUnbuiltPattern === false) {
    // Every files[] pattern resolves to a COMMITTED path, so the committed
    // artifact is the payload of record and only it counts. A src-only change
    // here is a build-freshness failure, not a publish drift, and is owned by
    // `pnpm check:schemas-freshness`.
    return null
  }
  if (NEVER_DERIVED.some((p) => matchPattern(p, rel))) {
    return null
  }
  if (DERIVED_SOURCE.some((p) => matchPattern(p, rel))) {
    return 'derived-build-input'
  }
  return null
}

/**
 * FN 2 — verdict for one candidate package. Pure and total: no git, no fs, no
 * network, so it can be known-answer tested (estate rule A2b).
 */
export function evaluatePackageDrift(input) {
  const {name, version, private: isPrivate, registry, files, trackedPaths, changedPaths, versionSettingCommit, commitStatus} = input
  const base = {name, version, versionSettingCommit: versionSettingCommit ?? null, offendingPaths: []}

  if (isPrivate === true) {
    return {...base, verdict: 'SKIPPED', reason: 'private'}
  }
  if (registry !== GITHUB_PACKAGES_REGISTRY) {
    return {...base, verdict: 'SKIPPED', reason: 'not-github-packages-registry'}
  }
  if (version === '0.0.0') {
    return {...base, verdict: 'SKIPPED', reason: 'unpublished-placeholder-version'}
  }
  if (commitStatus === 'truncated') {
    return {...base, verdict: 'INDETERMINATE', reason: 'shallow-history'}
  }
  if (commitStatus === 'no-history') {
    return {...base, verdict: 'INDETERMINATE', reason: 'no-manifest-history'}
  }

  // A files[] pattern with no tracked match means the payload is BUILT, not
  // committed — which is the state of every mantle package (files:['dist'],
  // dist/ gitignored) and of DS tokens. Without this tier the check would be
  // structurally incapable of ever failing for those packages: an A2b violation.
  const hasUnbuiltPattern = files !== null && files.some((p) => !trackedPaths.some((rel) => matchPattern(p, rel)))

  const offendingPaths = changedPaths.map((rel) => {
    const kind = classifyChangedPath(rel, files, hasUnbuiltPattern)
    return kind === null ? null : {path: rel, kind}
  }).filter((entry) => entry !== null).sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))

  if (offendingPaths.length > 0) {
    return {...base, verdict: 'DRIFT', reason: 'payload-changed-since-version-set', offendingPaths}
  }
  return {...base, verdict: 'CLEAN', reason: 'no-payload-change-since-version-set'}
}

// ─── I/O boundary ──────────────────────────────────────────────────────────────

function git(args) {
  const result = spawnSync('git', args, {cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024})
  if (result.error) {
    throw result.error
  }
  return {ok: result.status === 0, stdout: result.stdout ?? '', stderr: result.stderr ?? ''}
}

function gitOrThrow(args) {
  const result = git(args)
  if (!result.ok) {
    throw new Error(`git ${args.join(' ')} failed: ${result.stderr.trim()}`)
  }
  return result.stdout
}

function lines(stdout) {
  return stdout.split('\n').map((line) => line.trim()).filter((line) => line.length > 0)
}

/**
 * Candidate predicate, byte-identical to mantle/scripts/check-public-packages.mjs:68-76:
 * a DIRECT child of packages/, parseable JSON, not private, publishConfig.registry
 * exactly the GitHub Packages URL. Do not "improve" it — identical verdicts across
 * the three implementations of this check depend on the same package set.
 */
export function discoverCandidates(repoRoot) {
  const packagesDir = path.join(repoRoot, 'packages')
  const candidates = readdirSync(packagesDir, {withFileTypes: true}).filter((entry) => entry.isDirectory()).map((entry) => {
    try {
      return {dir: entry.name, manifest: JSON.parse(readFileSync(path.join(packagesDir, entry.name, 'package.json'), 'utf8'))}
    } catch {
      // An unparseable or absent manifest is not a package; skip it silently,
      // exactly as check-public-packages.mjs does.
      return null
    }
  }).filter((entry) => entry?.manifest?.private !== true && entry?.manifest?.publishConfig?.registry === GITHUB_PACKAGES_REGISTRY)

  return assertCandidateSet(candidates).sort((a, b) => (a.manifest.name < b.manifest.name ? -1 : 1))
}

/**
 * The guards that make discovery non-vacuous, split out from the fs walk so they
 * can be known-answer tested (estate rule A2b: a gate that can never fail is as
 * dangerous as one that never runs).
 */
export function assertCandidateSet(candidates) {
  if (candidates.length === 0) {
    throw new Error('No publishable design-system packages found under packages/ — discovery is broken, not clean')
  }
  for (const {manifest} of candidates) {
    if (!manifest.name.startsWith(SCOPE)) {
      throw new Error(`${manifest.name}: expected package scope ${SCOPE}`)
    }
  }
  return candidates
}

function readManifestAt(ref, pkgDir) {
  const result = git(['show', `${ref}:${pkgDir}/package.json`])
  if (!result.ok) {
    return null
  }
  try {
    return JSON.parse(result.stdout)
  } catch {
    return null
  }
}

/**
 * Did the OLDEST observable manifest commit actually introduce the manifest?
 *
 * `parentCount === 0` is ambiguous and the ambiguity is dangerous: git presents a
 * SHALLOW GRAFT BOUNDARY as a parentless commit, exactly like a real root commit.
 * Treating a graft boundary as "introduced" makes every package in a depth-1
 * checkout come back CLEAN with an empty diff — a silent, total pass of the whole
 * gate. (Observed: a `git clone --depth 1` of this repo reported 0 drifted.)
 *
 * So a boundary commit is never "introduced": it resolves to 'truncated', which
 * is INDETERMINATE and exit 2.
 */
export function computeIntroducedHere({parentCount, isShallowBoundary, manifestInFirstParent}) {
  if (isShallowBoundary) {
    return false // history is cut here; whether the manifest predates this commit is unknowable
  }
  if (parentCount === 0) {
    return true // genuine root commit
  }
  return !manifestInFirstParent
}

/** The commits listed in .git/shallow — where a shallow clone's history was cut. */
function readShallowBoundaries() {
  const shallowPath = git(['rev-parse', '--git-path', 'shallow'])
  if (!shallowPath.ok) {
    return new Set()
  }
  try {
    return new Set(lines(readFileSync(path.resolve(ROOT, shallowPath.stdout.trim()), 'utf8')))
  } catch {
    return new Set() // absent file = complete history
  }
}

function manifestIntroducedAt(sha, pkgDir, shallowBoundaries) {
  // `rev-list --parents -n 1 <sha>` prints "<sha> <parent1> [<parent2> ...]".
  const parents = gitOrThrow(['rev-list', '--parents', '-n', '1', sha]).trim().split(/\s+/).filter(Boolean).slice(1)
  return computeIntroducedHere({
    parentCount: parents.length,
    isShallowBoundary: shallowBoundaries.has(sha),
    manifestInFirstParent: parents.length > 0 && git(['cat-file', '-e', `${parents[0]}:${pkgDir}/package.json`]).ok
  })
}

/**
 * Build the NEWEST-FIRST manifest history for one package.
 *
 * `--first-parent` is mandatory: it makes a mainline merge that changed the
 * manifest the version-setting commit, and keeps the walk on the branch that
 * actually shipped.
 */
export function readManifestHistory(head, pkgDir, shallowBoundaries = readShallowBoundaries()) {
  const shas = lines(gitOrThrow(['rev-list', '--first-parent', head, '--', `${pkgDir}/package.json`]))
  return shas.map((sha, index) => {
    const manifest = readManifestAt(sha, pkgDir)
    const version = typeof manifest?.version === 'string' ? manifest.version : null
    const entry = {sha, version}
    if (index === shas.length - 1) {
      entry.introducedHere = manifestIntroducedAt(sha, pkgDir, shallowBoundaries)
    }
    return entry
  })
}

function toPackageRelative(pkgDir, stdout) {
  const prefix = `${pkgDir}/`
  return lines(stdout).filter((p) => p.startsWith(prefix)).map((p) => p.slice(prefix.length))
}

export function readPackageObservation(repoRoot, head, dir, manifest, historyComplete) {
  const pkgDir = `packages/${dir}`
  // The declared version comes from the head REF, never the working tree, so an
  // uncommitted bump cannot make a dirty checkout disagree with CI.
  const headManifest = readManifestAt(head, pkgDir) ?? manifest
  const declaredVersion = typeof headManifest.version === 'string' ? headManifest.version : manifest.version

  const manifestHistory = readManifestHistory(head, pkgDir)
  const {sha, status} = selectVersionSettingCommit(declaredVersion, manifestHistory, historyComplete)

  const trackedPaths = toPackageRelative(pkgDir, gitOrThrow(['ls-tree', '-r', '--name-only', head, '--', pkgDir]))
  // A TWO-POINT tree diff, not a range walk: same-commit bumps, reverts, merges
  // and cherry-picks are all correct with no special cases. Never pass -m/--cc.
  const changedPaths = sha === null ? [] : toPackageRelative(pkgDir, gitOrThrow(['diff', '--name-only', '--no-renames', sha, head, '--', pkgDir]))

  return {
    pkgDir,
    input: {
      name: headManifest.name ?? manifest.name,
      version: declaredVersion,
      private: headManifest.private === true,
      registry: headManifest.publishConfig?.registry ?? null,
      files: headManifest.publishConfig?.files ?? headManifest.files ?? null,
      trackedPaths,
      changedPaths,
      versionSettingCommit: sha,
      commitStatus: status
    }
  }
}

/** Paths the commits under review actually touched — the `--base` report filter. */
function reviewedPaths(base, head, pkgDir) {
  const result = git(['diff', '--name-only', '--no-renames', `${base}...${head}`, '--', pkgDir])
  if (!result.ok) {
    throw new Error(`--base ${base} is not resolvable against ${head}: ${result.stderr.trim()}`)
  }
  return new Set(toPackageRelative(pkgDir, result.stdout))
}

export function run({head = 'HEAD', base = null} = {}) {
  const historyComplete = gitOrThrow(['rev-parse', '--is-shallow-repository']).trim() !== 'true'
  const candidates = discoverCandidates(ROOT)

  const results = candidates.map(({dir, manifest}) => {
    const {pkgDir, input} = readPackageObservation(ROOT, head, dir, manifest, historyComplete)
    const result = evaluatePackageDrift(input)
    if (base !== null && result.verdict === 'DRIFT') {
      const reviewed = reviewedPaths(base, head, pkgDir)
      const introduced = result.offendingPaths.filter((entry) => reviewed.has(entry.path))
      if (introduced.length === 0) {
        // Pre-existing drift: real, but not introduced by the commits under
        // review. The unfiltered CI run still reports it.
        return {...result, verdict: 'CLEAN', reason: 'no-payload-change-since-version-set', offendingPaths: [], preExistingDrift: true}
      }
      return {...result, offendingPaths: introduced}
    }
    return result
  })

  const drift = results.filter((r) => r.verdict === 'DRIFT')
  const indeterminate = results.filter((r) => r.verdict === 'INDETERMINATE')
  const status = drift.length > 0 ? 1 : indeterminate.length > 0 ? 2 : 0
  return {head, base, historyComplete, results, drift, indeterminate, status}
}

// ─── Self-test (A2b: every check ships a known-answer self-test) ───────────────

const MANTLE_TRACKED = ['src/define-query.ts', 'test/x.test.ts', 'build.config.ts', 'tsconfig.json', 'vitest.config.ts', 'typedoc.json', 'package.json']

function published(overrides) {
  return {
    name: '@j0nathan-ll0yd/x',
    version: '1.0.0',
    private: false,
    registry: GITHUB_PACKAGES_REGISTRY,
    files: ['dist'],
    trackedPaths: [],
    changedPaths: [],
    versionSettingCommit: 'S',
    commitStatus: 'found',
    ...overrides
  }
}

export function selfTest() {
  // ── FN 1: selectVersionSettingCommit ──
  assert.deepEqual(selectVersionSettingCommit('1.1.0', [{sha: 'a', version: '1.1.0'}, {sha: 'b', version: '1.0.0'}], true), {sha: 'a', status: 'found'})
  // OLDEST of the leading streak: a later dep-bump touched package.json without moving version.
  assert.deepEqual(selectVersionSettingCommit('1.1.0', [{sha: 'a', version: '1.1.0'}, {sha: 'b', version: '1.1.0'}, {sha: 'c', version: '1.0.0'}], true), {
    sha: 'b',
    status: 'found'
  })
  // REVERT: must return the revert 'a', NOT the original 'c'. This is the exact
  // vector a `git log -S'"version": "1.0.0"'` implementation gets wrong.
  assert.deepEqual(selectVersionSettingCommit('1.0.0', [{sha: 'a', version: '1.0.0'}, {sha: 'b', version: '1.1.0'}, {sha: 'c', version: '1.0.0'}], true), {
    sha: 'a',
    status: 'found'
  })
  // A null version (manifest absent or unparseable at that commit) breaks the streak.
  assert.deepEqual(selectVersionSettingCommit('1.0.0', [{sha: 'a', version: '1.0.0'}, {sha: 'b', version: null}], true), {sha: 'a', status: 'found'})
  assert.deepEqual(selectVersionSettingCommit('1.0.0', [{sha: 'a', version: '1.0.0'}, {sha: 'b', version: '1.0.0', introducedHere: true}], true), {
    sha: 'b',
    status: 'introduced'
  })
  // Shallow clone: the streak ran off the end and the oldest entry did not
  // introduce the manifest, so the answer is unknowable — never a silent pass.
  assert.deepEqual(selectVersionSettingCommit('1.0.0', [{sha: 'a', version: '1.0.0'}, {sha: 'b', version: '1.0.0'}], false), {
    sha: null,
    status: 'truncated'
  })
  assert.deepEqual(selectVersionSettingCommit('1.0.0', [], true), {sha: null, status: 'no-history'})

  // ── computeIntroducedHere: the shallow-graft trap ──
  // git presents a shallow graft boundary as a PARENTLESS commit, exactly like a
  // real root commit. Calling that "introduced" made every package in a depth-1
  // checkout report CLEAN with an empty diff — a silent, total pass of the gate.
  // Regression-locked here because it is the whole point of A2b.
  assert.equal(computeIntroducedHere({parentCount: 0, isShallowBoundary: true, manifestInFirstParent: false}), false)
  assert.equal(computeIntroducedHere({parentCount: 0, isShallowBoundary: false, manifestInFirstParent: false}), true)
  assert.equal(computeIntroducedHere({parentCount: 1, isShallowBoundary: false, manifestInFirstParent: false}), true)
  assert.equal(computeIntroducedHere({parentCount: 1, isShallowBoundary: false, manifestInFirstParent: true}), false)
  // A boundary always wins, even when a parent happens to be reachable.
  assert.equal(computeIntroducedHere({parentCount: 1, isShallowBoundary: true, manifestInFirstParent: false}), false)
  // End to end: a boundary-rooted single-commit history must be truncated, not introduced.
  assert.deepEqual(
    selectVersionSettingCommit('1.0.0', [{
      sha: 'graft',
      version: '1.0.0',
      introducedHere: computeIntroducedHere({parentCount: 0, isShallowBoundary: true, manifestInFirstParent: false})
    }], false),
    {sha: null, status: 'truncated'}
  )

  // ── matchPattern: root-anchored, case-sensitive, POSIX ──
  assert.equal(matchPattern('dist', 'dist/index.mjs'), true)
  assert.equal(matchPattern('dist', 'dist'), true)
  assert.equal(matchPattern('dist', '__tests__/golden/dist/x.css'), false) // the tokens trap
  assert.equal(matchPattern('scripts/validate.ts', 'scripts/validate.ts'), true)
  assert.equal(matchPattern('scripts/validate.ts', 'scripts/check-freshness.sh'), false) // exact file, not a scripts/ wildcard
  assert.equal(matchPattern('src/*.css', 'src/base.css'), true)
  assert.equal(matchPattern('src/*.css', 'src/nested/base.css'), false) // '*' does not cross '/'
  assert.equal(matchPattern('src/**/*.css', 'src/nested/base.css'), true)
  assert.equal(matchPattern('eslint.js', 'eslint.js'), true)
  assert.equal(matchPattern('eslint.js', 'packages/config/eslint.js'), false) // inputs are already package-relative
  assert.throws(() => matchPattern('src/{a,b}.ts', 'src/a.ts'), UnsupportedFilesPatternError)
  // Negation is last-match-wins. No package in the estate uses one today; this
  // pins the semantics so the implementations cannot diverge if one appears.
  assert.equal(matchesFilesList(['dist', '!dist/secret.js'], 'dist/secret.js'), false)
  assert.equal(matchesFilesList(['dist', '!dist/secret.js'], 'dist/index.js'), true)

  // ── FN 2: skips and indeterminates ──
  assert.equal(evaluatePackageDrift(published({private: true})).reason, 'private')
  assert.equal(evaluatePackageDrift(published({registry: null})).reason, 'not-github-packages-registry')
  assert.equal(evaluatePackageDrift(published({version: '0.0.0'})).reason, 'unpublished-placeholder-version')
  const truncated = evaluatePackageDrift(published({commitStatus: 'truncated', versionSettingCommit: null}))
  assert.equal(truncated.verdict, 'INDETERMINATE')
  assert.equal(truncated.reason, 'shallow-history')
  assert.equal(evaluatePackageDrift(published({commitStatus: 'no-history', versionSettingCommit: null})).reason, 'no-manifest-history')

  // ── The two live DS drifts, as pure vectors ──
  const config = evaluatePackageDrift(
    published({
      name: '@j0nathan-ll0yd/config',
      version: '1.1.0',
      files: ['dprint.json', 'tsconfig-base.json', 'eslint.js', 'README.md'],
      trackedPaths: ['dprint.json', 'tsconfig-base.json', 'eslint.js', 'README.md', 'package.json'],
      changedPaths: ['eslint.js']
    })
  )
  assert.equal(config.verdict, 'DRIFT')
  assert.deepEqual(config.offendingPaths, [{path: 'eslint.js', kind: 'files'}])

  const schemasFiles = ['dist', 'swift', 'authored', 'generated', 'scripts/validate.ts', 'scripts/portal-contract-source.mjs', 'fixture-map.json']
  const schemasTracked = [
    'dist/index.js',
    'swift/A.swift',
    'authored/a.json',
    'generated/a.json',
    'scripts/validate.ts',
    'scripts/portal-contract-source.mjs',
    'scripts/check-freshness.sh',
    'fixture-map.json',
    'package.json'
  ]
  const schemas = evaluatePackageDrift(
    published({name: '@j0nathan-ll0yd/schemas', files: schemasFiles, trackedPaths: schemasTracked, changedPaths: ['scripts/validate.ts']})
  )
  assert.equal(schemas.verdict, 'DRIFT')
  assert.deepEqual(schemas.offendingPaths, [{path: 'scripts/validate.ts', kind: 'files'}])
  // Negative for the same package: a bare 'scripts/validate.ts' entry does not
  // glob the directory, and 'overlays' is not in files[].
  assert.equal(
    evaluatePackageDrift(published({files: schemasFiles, trackedPaths: schemasTracked, changedPaths: ['scripts/check-freshness.sh', 'overlays/a.json']}))
      .verdict,
    'CLEAN'
  )

  // ── The derived tier: the vector a files[]-only implementation fails ──
  const derived = evaluatePackageDrift(published({trackedPaths: MANTLE_TRACKED, changedPaths: ['src/define-query.ts']}))
  assert.equal(derived.verdict, 'DRIFT')
  assert.deepEqual(derived.offendingPaths, [{path: 'src/define-query.ts', kind: 'derived-build-input'}])
  assert.equal(evaluatePackageDrift(published({trackedPaths: MANTLE_TRACKED, changedPaths: ['test/x.test.ts', 'vitest.config.ts', 'typedoc.json']})).verdict,
    'CLEAN')
  assert.deepEqual(evaluatePackageDrift(published({trackedPaths: MANTLE_TRACKED, changedPaths: ['build.config.ts']})).offendingPaths, [{
    path: 'build.config.ts',
    kind: 'derived-build-input'
  }])

  // ── Committed-dist shape (DS copy/schemas): the committed artifact is the payload ──
  const committedDist = {files: ['dist'], trackedPaths: ['dist/index.js', 'src/a.ts']}
  assert.equal(evaluatePackageDrift(published({...committedDist, changedPaths: ['src/a.ts']})).verdict, 'CLEAN')
  assert.deepEqual(evaluatePackageDrift(published({...committedDist, changedPaths: ['dist/index.js']})).offendingPaths, [{
    path: 'dist/index.js',
    kind: 'files'
  }])

  // ── tokens shape: 'dist' has no tracked match, so the derived tier engages;
  //    the deleted .yalc-content-hash must stay suppressed by ALWAYS_EXCLUDED. ──
  assert.equal(
    evaluatePackageDrift(
      published({
        files: ['dist', 'src/base.css'],
        trackedPaths: ['src/base.css', '__tests__/golden/dist/x.css', 'package.json'],
        changedPaths: ['.yalc-content-hash']
      })
    ).verdict,
    'CLEAN'
  )

  // ── npm's always-pack set, even when files[] is only ['dist'] ──
  const alwaysIncluded = {files: ['dist'], trackedPaths: ['dist/i.js', 'README.md', 'package.json']}
  assert.deepEqual(evaluatePackageDrift(published({...alwaysIncluded, changedPaths: ['README.md']})).offendingPaths, [{
    path: 'README.md',
    kind: 'always-included'
  }])
  assert.deepEqual(evaluatePackageDrift(published({...alwaysIncluded, changedPaths: ['package.json']})).offendingPaths, [{
    path: 'package.json',
    kind: 'always-included'
  }])

  // ── No files[] at all: npm packs almost everything, so almost everything is drift ──
  assert.deepEqual(evaluatePackageDrift(published({files: null, changedPaths: ['src/a.ts', 'node_modules/x/i.js', 'test/b.test.ts']})).offendingPaths, [{
    path: 'src/a.ts',
    kind: 'no-files-field'
  }, {path: 'test/b.test.ts', kind: 'no-files-field'}])

  // ── Same-commit bump: the two-point diff S..head excludes S's own changes ──
  const sameCommit = evaluatePackageDrift(published({trackedPaths: MANTLE_TRACKED, changedPaths: []}))
  assert.equal(sameCommit.verdict, 'CLEAN')
  assert.equal(sameCommit.reason, 'no-payload-change-since-version-set')

  // ── Deterministic ordering, so the three implementations emit identical JSON ──
  assert.deepEqual(evaluatePackageDrift(published({files: null, changedPaths: ['z.ts', 'a.ts', 'm/b.ts']})).offendingPaths.map((e) => e.path), [
    'a.ts',
    'm/b.ts',
    'z.ts'
  ])

  // ── A2b: discovery that finds nothing must THROW, never exit 0 ──
  assert.throws(() => assertCandidateSet([]), /No publishable design-system packages found/)
  assert.throws(() => assertCandidateSet([{dir: 'x', manifest: {name: '@lifegames/x'}}]), /expected package scope @j0nathan-ll0yd\//)
  assert.equal(assertCandidateSet([{dir: 'x', manifest: {name: '@j0nathan-ll0yd/x'}}]).length, 1)

  // ── And discovery over the REAL tree must find every published DS package ──
  const discovered = discoverCandidates(ROOT).map((entry) => entry.manifest.name)
  assert.deepEqual(discovered, [
    '@j0nathan-ll0yd/config',
    '@j0nathan-ll0yd/copy',
    '@j0nathan-ll0yd/fixtures',
    '@j0nathan-ll0yd/schemas',
    '@j0nathan-ll0yd/tokens',
    '@j0nathan-ll0yd/web'
  ])
}

// ─── CLI ───────────────────────────────────────────────────────────────────────

function flagValue(argv, name) {
  const index = argv.indexOf(name)
  if (index === -1) {
    return null
  }
  const value = argv[index + 1]
  if (value === undefined || value.startsWith('--')) {
    throw new Error(`${name} requires a git ref`)
  }
  return value
}

function report(outcome) {
  const width = Math.max(...outcome.results.map((r) => r.name.length))
  process.stdout.write('\nPackage version drift — did the published payload change without a version bump?\n\n')
  for (const result of outcome.results) {
    const marker = {DRIFT: 'DRIFT ', CLEAN: 'ok    ', SKIPPED: 'skip  ', INDETERMINATE: '??????'}[result.verdict]
    const at = result.versionSettingCommit === null ? '—' : result.versionSettingCommit.slice(0, 8)
    process.stdout.write(`  ${marker} ${result.name.padEnd(width)}  ${result.version.padEnd(8)}  set by ${at}  ${result.reason}\n`)
    for (const entry of result.offendingPaths) {
      process.stdout.write(`         ↳ ${entry.path}  [${entry.kind}]\n`)
    }
  }

  process.stdout.write(
    `\n  ${outcome.results.length} published packages · ${outcome.drift.length} drifted · ${outcome.indeterminate.length} indeterminate\n`
  )

  if (outcome.drift.length > 0) {
    process.stdout.write(
      '\nERROR: the listed files changed after the declared version was set, so the\n' +
        'published tarball does NOT contain them. Consumers will never receive the change.\n\n' +
        "Fix by bumping the version through the package's own release path:\n" +
        '  @j0nathan-ll0yd/config              hand-edit packages/config/package.json,\n' +
        '                                      then run .github/workflows/publish-config.yml\n' +
        '  copy / fixtures / schemas /         set the version in the package manifest, then\n' +
        '  tokens / web                        run .github/workflows/publish-ds-packages.yml\n\n' +
        'The bump must be COMMITTED — this check reads the git ref, never the working tree,\n' +
        'so an uncommitted bump is invisible here (and would make CI and local disagree).\n'
    )
  }
  if (outcome.indeterminate.length > 0) {
    process.stdout.write(
      '\nERROR: version history could not be established for the packages marked ??????.\n' +
        'In CI this almost always means a shallow checkout: set actions/checkout with\n' +
        'fetch-depth: 0. Locally, run `git fetch --unshallow`.\n'
    )
  }
}

function main() {
  const argv = process.argv.slice(2)

  if (argv.includes('--self-test')) {
    selfTest()
    process.stdout.write('package version-drift self-test passed\n')
    process.exit(0)
  }

  const outcome = run({head: flagValue(argv, '--head') ?? 'HEAD', base: flagValue(argv, '--base')})

  if (argv.includes('--json')) {
    process.stdout.write(`${JSON.stringify(outcome, null, 2)}\n`)
  } else {
    report(outcome)
  }
  process.exit(outcome.status)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

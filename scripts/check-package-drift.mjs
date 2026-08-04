#!/usr/bin/env node
// mantle-cli-output: package payload-drift report for stdout
/**
 * Published-package payload drift gate — CONTENT-BASED.
 *
 * THE ONE-SENTENCE RULE
 * For every publishable workspace package, ask: does the payload we would publish
 * from THIS checkout differ from the payload already published under the version
 * this checkout declares? The reference is the REGISTRY, never a historical commit.
 *
 * WHY THIS REPLACED THE PATH-BASED GATE
 * The previous implementation answered "did any file matching files[] change since
 * the commit that set the declared version". That question has three blind spots the
 * registry-comparison question does not:
 *
 *   1. The workspace-dependency cascade. `pnpm publish` rewrites `workspace:*` to a
 *      concrete version, so bumping @j0nathan-ll0yd/schemas changes the PUBLISHED
 *      manifest of @j0nathan-ll0yd/fixtures even though no file under packages/fixtures
 *      changed. A path-based gate cannot see it. This is live in this repo today.
 *   2. "Version bumped but never published". The declared version being absent from the
 *      registry is invisible to any git-only check; consumers on a caret range keep
 *      resolving the stale tarball while CI is green.
 *   3. A truncated history. A shallow graft boundary is byte-identical to a real root
 *      commit, so the version-setting-commit resolver could not tell "this commit
 *      introduced the version" from "history is simply cut here" — a silent total pass.
 *      There is no history walk left, so no amount of truncation can change a verdict.
 *
 * WHAT SURVIVES OF GIT: exactly one `git ls-files` per package, for the leak screen.
 * It is depth-independent and behaves identically in a `--depth=1` clone.
 *
 * TRANSPORT: direct fetch(), NEVER `npm view` / `npm pack <spec>`.
 * MEASURED, not assumed: against a local toy registry, a gate built on `npm view` +
 * `npm pack` reported CLEAN / exit 0 with the registry PROCESS KILLED, because npm's
 * stale-if-error path serves ~/.npm/_cacache. Adding --prefer-online to both did NOT
 * fix it — still CLEAN, still exit 0. That is a silent total pass on an unreachable
 * registry. fetch() throws ECONNREFUSED and has no HTTP cache. Do not "simplify" this
 * by shelling npm; the `swallow` self-test mutant exists to catch that regression.
 * Requests are RETRIED (4 attempts, 500ms/1.5s/4s) on the statuses that mean "ask again",
 * because GitHub Packages answers 403 when it throttles — see REQUEST_ATTEMPTS. That can
 * only remove a flake; an exhausted retry reports exactly what it reported before.
 *
 * CANONICALISATION IS MANDATORY — raw tarball bytes are unusable.
 * MEASURED: three consecutive `pnpm pack` runs of one unedited package produced three
 * different tarball sha256 values and one identical canonical digest. pnpm resolves
 * workspace specifiers concurrently and reinserts the dependency keys in COMPLETION
 * ORDER, so dist.integrity / dist.shasum comparison is structurally impossible: the
 * registry's sha512 hashes bytes the producer cannot reproduce twice in a row. The
 * integrity hash is still used, correctly, to verify the DOWNLOAD. The `rawbytes`
 * mutant pins this.
 *
 * WHY SIX SCRIPTS — MEASURED 2026-08-03, NOT ASSUMED.
 * The two sides of the comparison are produced by DIFFERENT TOOLS, and this estate
 * publishes BOTH ways: `pnpm changeset publish` for copy|tokens|schemas|web|fixtures, and
 * `npm publish` for packages/config (.github/workflows/publish-config.yml). Measured on a
 * synthetic package carrying all 20 lifecycle hooks, npm 11.13.0 / pnpm 11.13.0:
 *   npm pack  applies NO manifest transform whatsoever — all 20 scripts survive.
 *   pnpm pack DELETES exactly six — postpack, postpublish, prepack, prepare,
 *             prepublishOnly, publish — and KEEPS legacy `prepublish`.
 * Ground truth from real registry bytes: the published @j0nathan-ll0yd/portal-contract@1.0.0
 * manifest is BYTE-IDENTICAL to its source, `prepublishOnly` included, while `pnpm pack` of
 * that same unmodified source drops it. So an engine that normalizes NOTHING — which is what
 * this file did before spec v3 — reports DRIFT on a package whose HEAD is exactly what is
 * published. That is finding X3, and it was live.
 * Dropping these six hides nothing consumer-visible: npm NEVER runs them from an installed
 * registry dependency, and whatever they produce lands in the built files, which ARE hashed.
 * Scripts a consumer DOES run — preinstall, install, postinstall — are deliberately excluded.
 * Legacy `prepublish` is excluded because NEITHER tool strips it, so both sides carry it
 * identically; stripping it would buy no agreement and only blind the gate to a real edit.
 * publishConfig hoisting and workspace:/catalog: rewriting are the same class of tool
 * asymmetry but are deliberately NOT normalized — normalizing them would destroy the
 * workspace-cascade signal this gate exists for. The full rationale, the normative
 * implementation and the 34 conformance vectors live in
 * atlas/contracts/package-digest/ (reference.mjs is the spec).
 *
 * A2b: NO STATE MEANS "could not tell, so pass". Registry unreachable, missing auth,
 * integrity mismatch and pack failure are all INDETERMINATE / exit 3 in every lane.
 *
 * Usage:
 *   node scripts/check-package-drift.mjs [--lane=branch|pre-push|post-publish]
 *                                        [--json] [--strict-maps] [--no-cache]
 *                                        [--no-build]
 *                                        [--repo-root=<dir>] [--registry=<url>]
 *                                        [--scope=<@scope>]
 *   node scripts/check-package-drift.mjs --self-test [--mutation=<id>]
 *
 * --json writes the JSON document to STDOUT AND NOTHING ELSE; all progress and build
 * output goes to stderr, so `check-package-drift.mjs --json | jq` works.
 */

import {createHash} from 'node:crypto'
import {execFile, spawnSync} from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import {fileURLToPath, pathToFileURL} from 'node:url'
import zlib from 'node:zlib'

/**
 * The digest scheme identifier. SAME NUMBER <=> BYTE-IDENTICAL NORMALIZATION, for every
 * input, across every implementation of this gate in the estate.
 *
 * Bump if and only if the bytes normalizeEntry()/payloadDigests() produce change for ANY
 * input: the stripped-key sets, canonicalize(), the serialization, the dead-source-map
 * predicate, or the payload line format. Do NOT bump for discovery, reporting, verdict
 * mapping, CLI flags or caching — those cannot alter a digest, and bumping for them
 * needlessly invalidates every cached reference.
 *
 * History: `1` meant "version only" here, but `1` ALSO meant "version + seven scripts" in
 * atlas and `2` meant "version only" in mantle. The number identified nothing (finding
 * X7). `3` is the first value greater than every number that was ever in circulation, and
 * it is asserted against the shared conformance fixture — so a scheme change without a
 * bump can no longer pass conformance in any repo.
 */
export const SPEC_VERSION = 3

/**
 * sha256 of scripts/fixtures/drift-conformance.json, vendored verbatim from
 * atlas/contracts/package-digest/. Pinned HERE, beside the implementation, so that
 * editing the vendored fixture without editing this constant turns the suite red
 * immediately — that is what makes vendoring safe rather than merely convenient.
 * Re-vendor and update this constant in the SAME change.
 */
export const DRIFT_CONFORMANCE_SHA256 = '10ab1c19a2848a60e4e0d7f86d1a55467f9d924cc3f1eeda6fc2fd10c6fb88ce'

export const DEFAULT_REGISTRY = 'https://npm.pkg.github.com'
export const DEFAULT_SCOPE = '@j0nathan-ll0yd'

/** Ordering is 4 > 3 > 2 > 0, which puts the most actionable failure in CI's summary. */
const EXIT_OK = 0
const EXIT_BLOCK = 2
const EXIT_INDETERMINATE = 3
const EXIT_BUILD = 4

export const LANES = ['branch', 'pre-push', 'post-publish']

/**
 * npm/pnpm always inject these at the PACKAGE ROOT regardless of files[] (pnpm also
 * copies the workspace-root LICENSE in), so they can appear in a payload without being
 * tracked under the package directory.
 */
const INJECTED_ROOT_FILE = /^(package\.json|(README|LICENSE|LICENCE|CHANGELOG|NOTICE)(\.[^/]*)?)$/i

// ─────────────────────────────────────────────────────────────────────────────
// Small utilities
// ─────────────────────────────────────────────────────────────────────────────

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex')
const sha512b64 = (buf) => createHash('sha512').update(buf).digest('base64')

/**
 * Escapes EVERY regex metacharacter before glob syntax is layered on top. The previous
 * generation of this rule shipped three implementations that disagreed on `[`, `]` and
 * `:`; escaping the full set removes the class of divergence rather than one instance.
 */
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Minimal glob → RegExp, used ONLY for turbo `outputs` patterns (see leak screen). */
export function globToRegExp(pattern) {
  let out = ''
  for (let i = 0; i < pattern.length; i += 1) {
    const c = pattern[i]
    if (c === '*') {
      if (pattern[i + 1] === '*') {
        // `a/**` matches `a/` and everything under it.
        out += '.*'
        i += 1
        if (pattern[i + 1] === '/') {
          i += 1
        }
      } else {
        out += '[^/]*'
      }
    } else if (c === '?') {
      out += '[^/]'
    } else {
      out += escapeRegExp(c)
    }
  }
  return new RegExp(`^${out}$`)
}

// ─────────────────────────────────────────────────────────────────────────────
// tar reader (dependency-free)
// ─────────────────────────────────────────────────────────────────────────────

function cstr(buf, off, len) {
  const slice = buf.subarray(off, off + len)
  const end = slice.indexOf(0)
  return (end === -1 ? slice : slice.subarray(0, end)).toString('utf8')
}

function parseOctal(buf, off, len) {
  const field = buf.subarray(off, off + len)
  if (field[0] & 0x80) {
    // GNU base-256. Not produced by npm/pnpm pack, but decoding beats mis-parsing.
    let value = 0n
    for (let i = 1; i < field.length; i += 1) {
      value = (value << 8n) | BigInt(field[i])
    }
    return Number(value)
  }
  const text = field.toString('ascii').replace(/\0.*$/, '').trim()
  return text === '' ? 0 : parseInt(text, 8)
}

function paxRecords(data) {
  const out = {}
  const text = data.toString('utf8')
  let off = 0
  while (off < text.length) {
    const space = text.indexOf(' ', off)
    if (space === -1) {
      break
    }
    const len = parseInt(text.slice(off, space), 10)
    if (!Number.isFinite(len) || len <= 0) {
      break
    }
    const record = text.slice(space + 1, off + len).replace(/\n$/, '')
    const eq = record.indexOf('=')
    if (eq !== -1) {
      out[record.slice(0, eq)] = record.slice(eq + 1)
    }
    off += len
  }
  return out
}

/**
 * Returns Map<pathRelativeToPackageRoot, Buffer>. npm tarballs root everything under
 * `package/`; anything else is a malformed reference and must not be compared.
 */
export function readTarball(gzBytes) {
  const tar = zlib.gunzipSync(gzBytes)
  const files = new Map()
  let off = 0
  let longName = null
  let paxName = null

  while (off + 512 <= tar.length) {
    const header = tar.subarray(off, off + 512)
    off += 512
    if (header.every((b) => b === 0)) {
      break
    }

    const size = parseOctal(header, 124, 12)
    const typeflag = String.fromCharCode(header[156])
    const data = tar.subarray(off, off + size)
    off += Math.ceil(size / 512) * 512

    if (typeflag === 'L') {
      longName = data.toString('utf8').replace(/\0+$/, '')
      continue
    }
    if (typeflag === 'x' || typeflag === 'X') {
      const rec = paxRecords(data)
      if (rec.path) {
        paxName = rec.path
      }
      continue
    }
    if (typeflag === 'g') {
      continue
    }

    let name = cstr(header, 0, 100)
    const prefix = cstr(header, 345, 155)
    if (prefix) {
      name = `${prefix}/${name}`
    }
    if (longName) {
      name = longName
      longName = null
    }
    if (paxName) {
      name = paxName
      paxName = null
    }

    if (typeflag === '5' || name.endsWith('/')) {
      continue
    }
    if (typeflag !== '0' && typeflag !== '\0') {
      throw new Error(`unsupported tar entry type ${JSON.stringify(typeflag)} for ${name}`)
    }

    const normalized = name.replace(/^\.\//, '')
    if (!normalized.startsWith('package/')) {
      throw new Error(`tar entry outside package/: ${normalized}`)
    }
    files.set(normalized.slice('package/'.length), Buffer.from(data))
  }
  return files
}

// ─────────────────────────────────────────────────────────────────────────────
// Canonical payload digest
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Publish-time-only lifecycle scripts, removed from the manifest before hashing.
 * Sorted, and EXACTLY the set `pnpm pack` removes — see the "WHY SIX SCRIPTS" block in
 * the file header for the measurement. Legacy `prepublish` is deliberately absent.
 */
export const PUBLISH_ONLY_SCRIPTS = Object.freeze([
  'postpack',
  'postpublish',
  'prepack',
  'prepare',
  'prepublishOnly',
  'publish'
])

/** The one entry path that is normalized. Nested manifests (dist/package.json) are raw. */
export const MANIFEST_ENTRY = 'package.json'

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)

/** Recursively sorts object keys. Arrays keep their order — order is meaning there. */
export function canonicalize(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalize(entry))
  }
  if (!isPlainObject(value)) {
    return value
  }
  const sorted = {}
  for (const key of Object.keys(value).sort()) {
    sorted[key] = canonicalize(value[key])
  }
  return sorted
}

/**
 * Canonical bytes for one packed file. Only the TOP-LEVEL `package.json` is normalized;
 * every other entry — including a nested `dist/package.json` — is compared as RAW BYTES.
 *
 * A manifest that will not parse, or that parses to something other than an object, is
 * also compared raw. It must surface as a difference rather than be swallowed, and it
 * must NOT throw: this implementation previously threw a SyntaxError there while the
 * other two fell back to raw bytes, which is exactly the divergence the shared
 * conformance fixture now pins (`cmp-malformed-manifest-edit-is-drift`).
 *
 * Nested workspace-dependency versions are deliberately KEPT — that is exactly what
 * catches the cascade (a sibling moving 1.0.0 -> 1.0.1 inside dependencies[]).
 * `version` is deleted so the head-vs-semverMax(R) comparison is meaningful; when the
 * declared version IS published the two versions match anyway, so the deletion is inert.
 */
export function normalizeEntry(entryPath, bytes) {
  if (entryPath !== MANIFEST_ENTRY) {
    return bytes
  }
  let parsed
  try {
    parsed = JSON.parse(bytes.toString('utf8'))
  } catch {
    return bytes
  }
  if (!isPlainObject(parsed)) {
    return bytes
  }
  const canonical = canonicalize(parsed)
  delete canonical.version
  if (isPlainObject(canonical.scripts)) {
    for (const name of PUBLISH_ONLY_SCRIPTS) {
      delete canonical.scripts[name]
    }
    // `pnpm pack` emits `"scripts": {}` where `npm publish` emits the original object and
    // a source with no scripts emits no key at all. Collapsing empty-to-absent makes those
    // three spellings of "no runnable scripts" hash identically.
    if (Object.keys(canonical.scripts).length === 0) {
      delete canonical.scripts
    }
  }
  return Buffer.from(JSON.stringify(canonical), 'utf8')
}

/**
 * Is this a source map that NO consumer can resolve?
 *
 * Dead only when EVERY `sources[]` entry lands outside the packed set. A map with even
 * one resolvable source is still usable, so it stays in the effective digest — the
 * conservative direction, since keeping a file can only ever cause a report, never
 * suppress one.
 *
 * `sourceRoot` is honoured, per the source-map spec: it is prefixed to every source
 * before resolution. A `data:` source is inlined content, always resolvable, so a map
 * carrying one is never dead. Both were missing here before spec v3.
 *
 * A map-only difference cannot hide a real change: anything altering behaviour or types
 * also alters a .js/.mjs/.d.ts entry.
 */
export function isDeadSourceMap(entryPath, bytes, packedPaths) {
  if (!entryPath.endsWith('.map')) {
    return false
  }
  let map
  try {
    map = JSON.parse(bytes.toString('utf8'))
  } catch {
    return false
  }
  if (!isPlainObject(map) || !Array.isArray(map.sources) || map.sources.length === 0) {
    return false
  }
  const sourceRoot = typeof map.sourceRoot === 'string' ? map.sourceRoot : ''
  const dir = path.posix.dirname(entryPath)
  return map.sources.every((source) => {
    if (typeof source !== 'string' || source.startsWith('data:')) {
      return false
    }
    return !packedPaths.has(path.posix.normalize(path.posix.join(dir === '.' ? '' : dir, sourceRoot, source)))
  })
}

/** Per-file normalized digests, as a Map — the input to the payload digest and the diff. */
export function fileDigests(files, exclude = new Set()) {
  const out = new Map()
  for (const entryPath of [...files.keys()].sort()) {
    if (exclude.has(entryPath)) {
      continue
    }
    out.set(entryPath, sha256(normalizeEntry(entryPath, files.get(entryPath))))
  }
  return out
}

/** digest = sha256( sorted `<posix path> <sha256hex>` lines joined by "\n" ) */
export function digestOf(perFile) {
  const lines = [...perFile].map(([entryPath, hash]) => `${entryPath} ${hash}`).sort()
  return sha256(Buffer.from(lines.join('\n'), 'utf8'))
}

/**
 * Both digests plus the dead maps, in one pass. This is the shape the shared conformance
 * runner asserts against.
 *
 * @param {Map<string, Buffer>} files packed entries, posix paths relative to the tarball root
 * @param {Set<string>} [exclude] leak-screen hits, removed entirely so a leak reports as
 *   LEAKED_ARTIFACT rather than masquerading as DRIFT
 */
export function payloadDigests(files, exclude = new Set()) {
  const packedPaths = new Set([...files.keys()].filter((entryPath) => !exclude.has(entryPath)))
  const strict = fileDigests(files, exclude)
  const dead = []
  for (const entryPath of strict.keys()) {
    if (isDeadSourceMap(entryPath, files.get(entryPath), packedPaths)) {
      dead.push(entryPath)
    }
  }
  const deadSet = new Set(dead)
  const effective = new Map([...strict].filter(([entryPath]) => !deadSet.has(entryPath)))
  return {strictDigest: digestOf(strict), effectiveDigest: digestOf(effective), strictEntries: strict, effectiveEntries: effective, deadMaps: dead.sort()}
}

export function differingFiles(headPerFile, refPerFile) {
  const names = new Set([...headPerFile.keys(), ...refPerFile.keys()])
  return [...names].filter((n) => headPerFile.get(n) !== refPerFile.get(n)).sort()
}

// ─────────────────────────────────────────────────────────────────────────────
// semver (the subset this gate needs)
// ─────────────────────────────────────────────────────────────────────────────

const SEMVER = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/

export function parseSemver(v) {
  const m = SEMVER.exec(String(v).trim())
  if (!m) {
    return null
  }
  return {major: +m[1], minor: +m[2], patch: +m[3], pre: m[4] ? m[4].split('.') : null}
}

export function compareSemver(a, b) {
  const pa = parseSemver(a)
  const pb = parseSemver(b)
  if (!pa || !pb) {
    return String(a).localeCompare(String(b))
  }
  for (const key of ['major', 'minor', 'patch']) {
    if (pa[key] !== pb[key]) {
      return pa[key] < pb[key] ? -1 : 1
    }
  }
  if (!pa.pre && !pb.pre) {
    return 0
  }
  if (!pa.pre) {
    return 1
  }
  if (!pb.pre) {
    return -1
  }
  const len = Math.max(pa.pre.length, pb.pre.length)
  for (let i = 0; i < len; i += 1) {
    const x = pa.pre[i]
    const y = pb.pre[i]
    if (x === undefined) {
      return -1
    }
    if (y === undefined) {
      return 1
    }
    if (x === y) {
      continue
    }
    const nx = /^\d+$/.test(x)
    const ny = /^\d+$/.test(y)
    if (nx && ny) {
      return +x < +y ? -1 : 1
    }
    if (nx) {
      return -1
    }
    if (ny) {
      return 1
    }
    return x < y ? -1 : 1
  }
  return 0
}

export const semverMax = (versions) => [...versions].sort(compareSemver).at(-1)

// ─────────────────────────────────────────────────────────────────────────────
// Step 0 — Discovery (package-manager-agnostic, no history)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * WHY THIS IS NOT `pnpm list -r --depth -1 --json` ANY MORE (finding D1/X1).
 *
 * That call was this file's ONLY enumeration source, and its doc comment called it "the
 * authoritative workspace enumeration". It is not authoritative — it is the package
 * manager's opinion of DECLARED MEMBERSHIP, and a package the workspace config does not
 * name is invisible to it.
 *
 * MEASURED, on the real mantle-LifegamesPortal: that repo's `pnpm-workspace.yaml` is
 * settings-only and carries no `packages:` key at all, so `pnpm list -r --depth -1
 * --json` returns the PRIVATE ROOT ALONE. Its `packages/portal-contract` — a real,
 * published `@j0nathan-ll0yd/*` package — was therefore never inventoried, and this gate
 * printed "0 publishable package(s): nothing evaluated / exit 0". A gate that reports a
 * silent total pass on a repo it is meant to protect is worse than no gate.
 *
 * The fix is to UNION two independent sources so neither can narrow the inventory:
 *
 *   1. the workspace globs DECLARED by whichever package manager this repo uses
 *      (`declaredWorkspaceGlobs`), and
 *   2. a plain directory scan for every `package.json` in the tree
 *      (`manifestDirectories`), which does not care about workspace config at all.
 *
 * Git-ignored candidates are then removed (`gitIgnoredPaths`) and the survivors reduced
 * to the directories that name a package in their own right (`selectPackageDirectories`).
 * A manifest that exists but cannot be read becomes a RECORDED ERROR that raises the exit
 * floor — never a silent drop.
 *
 * M6 (inventory discovered from the working tree while evaluating another ref) remains
 * fixed BY CONSTRUCTION: there is exactly one tree. Discovery, build and pack all read
 * `repoRoot`. `--head` / `--base` do not exist — evaluating an arbitrary ref is not
 * meaningful when the payload requires a build and a build requires a materialised tree.
 */

/**
 * A symlink-loop and pathological-tree guard, NOT a layout assumption. It is deliberately
 * far deeper than any real layout (the deepest package directory in this estate is
 * `packages/<name>`, depth 2) precisely so it can never become the reason a package is
 * missed. Symlinked directories are skipped outright, so this bound is only ever reached
 * by a genuinely pathological tree.
 */
const MAX_SCAN_DEPTH = 12

/**
 * Workspace globs are matched with the SAME `globToRegExp` the turbo-outputs leak screen
 * uses — one glob engine in this file, which was the one genuine merit of the pnpm-only
 * design. Only the surrounding syntax is normalised: a leading `./` and a trailing `/`
 * are spellings, not meaning.
 */
export function workspaceGlobToRegExp(glob) {
  return globToRegExp(glob.replace(/^\.\//, '').replace(/\/$/, ''))
}

/**
 * Workspace member globs DECLARED by whichever package manager this repo uses.
 *
 * pnpm keeps them under `packages:` in `pnpm-workspace.yaml`; npm, yarn and bun keep them
 * in the root manifest's `workspaces`, either as an array or as `{packages: [...]}` (yarn
 * classic). ANY OF THESE MAY BE ABSENT — this is one of two enumeration sources, not the
 * authority, and returning `[]` is a perfectly normal answer.
 *
 * The YAML read is a deliberate ~15-line list scanner rather than a YAML dependency: the
 * shape is a fixed one (`packages:` followed by `- <glob>` items) and this gate must run
 * from a bare `node scripts/...` with no runtime dependency at all. Anything it cannot
 * parse simply contributes no globs, and the directory scan still finds the packages.
 */
export function declaredWorkspaceGlobs(repoRoot) {
  const globs = []
  const workspaceFile = path.join(repoRoot, 'pnpm-workspace.yaml')
  if (fs.existsSync(workspaceFile)) {
    let inPackages = false
    for (const line of fs.readFileSync(workspaceFile, 'utf8').split('\n')) {
      if (/^packages:\s*$/.test(line)) {
        inPackages = true
        continue
      }
      if (!inPackages) {
        continue
      }
      const item = /^\s+-\s*(.+?)\s*$/.exec(line)
      if (!item) {
        // Any non-blank line at column 0 ends the block.
        if (line.trim() !== '' && !line.startsWith(' ')) {
          inPackages = false
        }
        continue
      }
      globs.push(item[1].replace(/^['"]|['"]$/g, ''))
    }
  }
  const rootManifestFile = path.join(repoRoot, 'package.json')
  if (fs.existsSync(rootManifestFile)) {
    let workspaces
    try {
      workspaces = JSON.parse(fs.readFileSync(rootManifestFile, 'utf8'))?.workspaces
    } catch {
      workspaces = undefined
    }
    if (Array.isArray(workspaces)) {
      globs.push(...workspaces.filter((entry) => typeof entry === 'string'))
    } else if (isPlainObject(workspaces) && Array.isArray(workspaces.packages)) {
      globs.push(...workspaces.packages.filter((entry) => typeof entry === 'string'))
    }
  }
  return globs
}

/**
 * Bare directory names declared as build outputs by the ROOT turbo config, used only to
 * prune the scan. A `dist/package.json` is part of its package's payload, never a
 * separate publishable unit — `selectPackageDirectories` would reject it anyway, so this
 * is a cost saving with a defence-in-depth flavour, not a correctness rule.
 */
export function buildOutputDirNames(repoRoot) {
  const dirs = new Set(['dist'])
  const turboFile = path.join(repoRoot, 'turbo.json')
  if (!fs.existsSync(turboFile)) {
    return dirs
  }
  let tasks
  try {
    tasks = JSON.parse(fs.readFileSync(turboFile, 'utf8').replace(/^\s*\/\/.*$/gm, ''))?.tasks
  } catch {
    return dirs
  }
  for (const [taskName, task] of Object.entries(tasks ?? {})) {
    if (taskName !== 'build' && !taskName.endsWith('#build')) {
      continue
    }
    for (const output of Array.isArray(task?.outputs) ? task.outputs : []) {
      const head = String(output).replace(/^!/, '').split('/')[0]
      if (head && head !== '**' && head !== '.' && head !== '..') {
        dirs.add(head)
      }
    }
  }
  return dirs
}

/**
 * Every directory under `repoRoot` carrying a `package.json`, as repo-relative posix
 * paths (`.` for the root itself).
 *
 * THIS IS THE SOURCE THAT DOES NOT CARE WHICH PACKAGE MANAGER THE REPO USES, which is the
 * whole point of finding D1. It cannot be narrowed by a missing `packages:` key, by an
 * unconventional layout, or by a workspace glob that silently stopped matching.
 */
export function manifestDirectories(repoRoot, skipDirNames = new Set()) {
  const found = []
  const walk = (absolute, depth) => {
    let entries
    try {
      entries = fs.readdirSync(absolute, {withFileTypes: true})
    } catch {
      return
    }
    if (entries.some((entry) => entry.isFile() && entry.name === 'package.json')) {
      found.push(path.relative(repoRoot, absolute).split(path.sep).join('/') || '.')
    }
    if (depth >= MAX_SCAN_DEPTH) {
      return
    }
    for (const entry of entries) {
      // isSymbolicLink() is checked BEFORE isDirectory(): a symlinked directory reports as
      // a link here, and following one is how a walk finds pnpm's node_modules farm or a
      // cycle.
      if (entry.isSymbolicLink() || !entry.isDirectory()) {
        continue
      }
      if (entry.name.startsWith('.') || entry.name === 'node_modules' || skipDirNames.has(entry.name)) {
        continue
      }
      walk(path.join(absolute, entry.name), depth + 1)
    }
  }
  walk(repoRoot, 0)
  return found.sort()
}

/**
 * The subset of `candidates` that git ignores — scaffolding scratch, generated fixtures
 * and the like, which are by construction not part of the repo's published surface.
 * Untracked-but-not-ignored directories are deliberately KEPT, so a package added in the
 * working tree and not yet committed is still checked.
 *
 * If git cannot answer (not a repo, git absent), NOTHING is filtered: dropping a candidate
 * on a failed probe would be exactly the silent-narrowing bug this change exists to remove.
 */
export function gitIgnoredPaths(repoRoot, candidates) {
  const relevant = [...candidates].filter((entry) => entry !== '.')
  if (relevant.length === 0) {
    return new Set()
  }
  const result = spawnSync('git', ['check-ignore', '--stdin', '-z'], {
    cwd: repoRoot,
    input: `${relevant.join('\0')}\0`,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024
  })
  // 0 = some paths are ignored, 1 = none are, anything else (128, ENOENT) = git could not
  // answer, and "could not tell" must never narrow the inventory.
  if (result.error || (result.status !== 0 && result.status !== 1)) {
    return new Set()
  }
  return new Set(result.stdout.split('\0').filter(Boolean))
}

/**
 * Directories that name a package in their own right, from the union of both sources.
 *
 * A directory qualifies when it is the repo root, when it matches a DECLARED workspace
 * glob, or when its nearest manifest-bearing ancestor is the root. That last rule is what
 * makes a bare scan safe: a `package.json` nested INSIDE another package (a fixture, a
 * scaffolding template, a `dist/package.json`) belongs to that package's payload and is
 * hashed as part of it, exactly as the digest rule says — it is not a separate publishable
 * unit. A genuinely nested layout is still covered, because such a layout must declare the
 * inner glob for its own package manager to work, and the glob source picks it up.
 */
export function selectPackageDirectories(manifestDirs, globs) {
  const present = new Set(manifestDirs)
  const positive = globs.filter((glob) => !glob.startsWith('!')).map((glob) => workspaceGlobToRegExp(glob))
  const negative = globs.filter((glob) => glob.startsWith('!')).map((glob) => workspaceGlobToRegExp(glob.slice(1)))
  const selected = new Set()
  for (const dir of manifestDirs) {
    if (dir === '.') {
      selected.add(dir)
      continue
    }
    if (negative.some((pattern) => pattern.test(dir))) {
      continue
    }
    if (positive.some((pattern) => pattern.test(dir))) {
      selected.add(dir)
      continue
    }
    const segments = dir.split('/')
    const hasNearerAncestor = segments.slice(0, -1).some((_, index) => present.has(segments.slice(0, index + 1).join('/')))
    if (!hasNearerAncestor) {
      selected.add(dir)
    }
  }
  return [...selected].sort()
}

/**
 * Step 0. Returns `{members, errors, sources}` — never throws for a per-manifest problem.
 *
 * `members` carry an ABSOLUTE `path` (the contract the rest of this file already had, from
 * the days of `pnpm list`), plus `relativePath` and `discoveredBy` for the report.
 * `errors` are manifests that exist and could not be read; they raise the exit floor to
 * INDETERMINATE rather than vanishing.
 */
export function discoverWorkspace(repoRoot) {
  const globs = declaredWorkspaceGlobs(repoRoot)
  const manifestDirs = manifestDirectories(repoRoot, buildOutputDirNames(repoRoot))
  const ignored = gitIgnoredPaths(repoRoot, manifestDirs)
  const selected = selectPackageDirectories(manifestDirs.filter((dir) => !ignored.has(dir)), globs)

  const positive = globs.filter((glob) => !glob.startsWith('!')).map((glob) => workspaceGlobToRegExp(glob))
  const members = []
  const errors = []
  const sources = new Set()

  for (const relativePath of selected) {
    const absolutePath = relativePath === '.' ? repoRoot : path.join(repoRoot, relativePath)
    let manifest
    try {
      manifest = JSON.parse(fs.readFileSync(path.join(absolutePath, 'package.json'), 'utf8'))
    } catch (err) {
      errors.push(`${relativePath}/package.json could not be read: ${err.message}`)
      continue
    }
    if (!isPlainObject(manifest)) {
      errors.push(`${relativePath}/package.json is not a JSON object`)
      continue
    }
    const discoveredBy = relativePath === '.'
      ? 'repository root'
      : (positive.some((pattern) => pattern.test(relativePath)) ? 'declared workspace glob' : 'directory scan')
    sources.add(discoveredBy)
    members.push({
      name: manifest.name,
      version: manifest.version,
      path: absolutePath,
      relativePath,
      private: manifest.private,
      publishConfig: manifest.publishConfig,
      discoveredBy
    })
  }
  return {members, errors, sources: [...sources].sort()}
}

/**
 * `registryOverridden` exists because discovery now reads the MANIFEST rather than
 * `pnpm list --json`, which never reported `publishConfig` at all. That is strictly more
 * information, but it makes an explicit `--registry=` ambiguous: every fixture manifest
 * declares its own toy-registry URL, so comparing the two would classify a deliberately
 * retargeted run as "publishes somewhere else" and skip everything — which is precisely
 * the silent-narrowing shape this change exists to remove.
 *
 * An operator who names a registry has said which registry to evaluate against, so the
 * override wins over `publishConfig` (this is mantle's `registryOverride !== undefined`
 * rule). It can only ever WIDEN the inventory, never narrow it, so it cannot launder a
 * green run: a wrong URL yields INDETERMINATE / exit 3 (A2b), never a pass.
 */
export function classifyMember(member, {registry, scope, registryOverridden = false}) {
  if (member.private === true) {
    return {publishable: false, reason: 'private: true'}
  }
  if (!member.name) {
    return {publishable: false, reason: 'no name'}
  }
  if (registryOverridden) {
    return {publishable: true}
  }
  const configured = member.publishConfig?.registry
  if (configured) {
    const same = configured.replace(/\/$/, '') === registry.replace(/\/$/, '')
    return same
      ? {publishable: true}
      : {publishable: false, reason: `publishConfig.registry=${configured}`}
  }
  if (member.name.startsWith(`${scope}/`)) {
    return {publishable: true}
  }
  return {publishable: false, reason: `outside ${scope} scope and no publishConfig.registry`}
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1 — Auth (before any work). No anonymous fallback exists.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * MEASURED: with GITHUB_TOKEN/NODE_AUTH_TOKEN unset and HOME pointed at an empty dir,
 * `npm pack @j0nathan-ll0yd/env@1.0.0 --registry=https://npm.pkg.github.com` returns
 * E401. GitHub Packages requires a token even for PUBLIC packages, so every lane must
 * supply one and there is nothing to fall back to.
 *
 * ~/.npmrc is read DIRECTLY, not via `npm config get`: pnpm and npm read different user
 * config files, so shelling the wrong one silently reports "no token" on a host that
 * has one.
 */
export function resolveToken({
  env = process.env,
  home = os.homedir(),
  registry = DEFAULT_REGISTRY,
  allowGhCli = true
} = {}) {
  const tried = []
  for (const key of ['DRIFT_REGISTRY_TOKEN', 'NODE_AUTH_TOKEN', 'GITHUB_TOKEN']) {
    tried.push(`env:${key}`)
    if (env[key]) {
      return {token: env[key], source: `env:${key}`, tried}
    }
  }

  const host = new URL(registry).host
  const npmrc = path.join(home, '.npmrc')
  tried.push(`${npmrc} //${host}/:_authToken`)
  if (fs.existsSync(npmrc)) {
    const pattern = new RegExp(`^\\s*//${escapeRegExp(host)}/:_authToken\\s*=\\s*(.+)$`, 'm')
    const match = pattern.exec(fs.readFileSync(npmrc, 'utf8'))
    if (match) {
      // npm expands ${VAR} in .npmrc; pnpm does not. Expand here so both agree, and
      // treat an unexpandable placeholder as "no token" rather than sending it literally.
      const raw = match[1].trim().replace(/^["']|["']$/g, '')
      const expanded = raw.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_, name) => env[name] ?? '')
      if (expanded && !expanded.includes('${')) {
        return {token: expanded, source: npmrc, tried}
      }
    }
  }

  if (allowGhCli) {
    tried.push('gh auth token')
    const gh = spawnSync('gh', ['auth', 'token'], {encoding: 'utf8'})
    if (!gh.error && gh.status === 0 && gh.stdout.trim()) {
      return {token: gh.stdout.trim(), source: 'gh auth token', tried}
    }
  }

  return {token: null, source: null, tried}
}

// ─────────────────────────────────────────────────────────────────────────────
// Steps 2 / 6 — Registry client (packument ALWAYS over the wire, never cached)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Attempts per request, and the pause before each retry.
 *
 * WHY THIS EXISTS — MEASURED 2026-08-04, not theorised. GitHub Packages answers `HTTP 403`
 * WHEN IT THROTTLES, the same status it uses for a genuinely bad token, and during a burst
 * of merges it did so for a single package. One unretried 403 is enough: that package went
 * INDETERMINATE, the run exited 3 (correctly — "could not tell" is never a pass), the CI
 * gate failed, and because the publish workflow is gated on CI, NOTHING published from main
 * for the next two merges. This repo's PR #158 drift job failed the same way after 14m1s.
 * A momentary throttle stopped the release train.
 *
 * RETRYING DOES NOT WEAKEN A2b, and that is the property to protect when editing this.
 * Exhausted attempts return the SAME auth/unreachable result they returned before and still
 * become INDETERMINATE / exit 3. This removes a flake; it can never manufacture a pass. A
 * genuinely bad token costs these four attempts and then reports exactly what it always
 * reported. The `retries never manufacture a pass` tests in check-package-drift.test.mjs
 * pin both halves.
 *
 * Ported verbatim in behaviour from the twin mantle engine
 * (packages/cli/src/commands/check/package-versions/registry.ts) — same attempt count, same
 * backoff, same status set — because two engines answering the same question must not
 * disagree about when the answer is trustworthy.
 */
const REQUEST_ATTEMPTS = 4
const RETRY_BACKOFF_MS = [500, 1500, 4000]

/**
 * Statuses worth a second ask: throttling, timeouts, and the transient 5xx family.
 * 404 IS DELIBERATELY ABSENT — an absent package is an answer, not a flake, and retrying it
 * would only make the common NEVER_PUBLISHED path four times slower.
 */
const RETRYABLE_STATUSES = new Set([403, 408, 425, 429, 500, 502, 503, 504])

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * `Retry-After` in seconds, or as an HTTP date. Ignored when absent, unparseable, or longer
 * than a minute — a throttle we would have to wait out that long is better reported than
 * slept through, because a gate that hangs is a gate nobody runs.
 */
export function retryAfterMs(response) {
  const header = response.headers.get('retry-after')
  if (header === null) {
    return null
  }
  const seconds = Number(header)
  const ms = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(header) - Date.now()
  return Number.isFinite(ms) && ms > 0 && ms <= 60_000 ? ms : null
}

/**
 * `fetch` with bounded retries. Returns `{response}` for the last response, or `{error}` when
 * every attempt threw.
 *
 * It classifies NOTHING. The caller alone decides what a status means, so no retry decision
 * can quietly become a verdict decision — a 403 that survives every attempt still reaches
 * fetchPackument as a 403 and still becomes `auth`.
 */
async function fetchWithRetry(url, init) {
  let last = {error: new Error('no attempt was made')}
  for (let attempt = 0; attempt < REQUEST_ATTEMPTS; attempt += 1) {
    let retryDelay = RETRY_BACKOFF_MS[attempt] ?? null
    try {
      const response = await fetch(url, init)
      last = {response}
      if (!RETRYABLE_STATUSES.has(response.status)) {
        return last
      }
      retryDelay = retryDelay === null ? null : (retryAfterMs(response) ?? retryDelay)
    } catch (err) {
      last = {error: err}
    }
    if (retryDelay === null) {
      return last
    }
    await sleep(retryDelay)
  }
  return last
}

/** The `unreachable` detail for a transport-level failure, shared by both fetchers. */
const transportDetail = (err, url) => `${err?.cause?.code ?? err?.code ?? 'FETCH_FAILED'} fetching ${url}`

export async function fetchPackument(registry, name, token) {
  const url = `${registry.replace(/\/$/, '')}/${encodeURIComponent(name)}`
  const attempt = await fetchWithRetry(url, {
    headers: {Authorization: `Bearer ${token}`, Accept: 'application/vnd.npm.install-v1+json', 'Cache-Control': 'no-cache'}
  })
  if (!('response' in attempt)) {
    return {kind: 'unreachable', detail: transportDetail(attempt.error, url)}
  }
  const response = attempt.response
  if (response.status === 404) {
    return {kind: 'absent', versions: {}}
  }
  if (response.status === 401 || response.status === 403) {
    return {kind: 'auth', detail: `HTTP ${response.status} from ${url}`}
  }
  if (!response.ok) {
    return {kind: 'unreachable', detail: `HTTP ${response.status} from ${url}`}
  }
  let body
  try {
    body = await response.json()
  } catch {
    return {kind: 'unreachable', detail: `non-JSON packument from ${url}`}
  }
  return {kind: 'ok', versions: body.versions ?? {}}
}

export async function fetchTarball(url, token, integrity) {
  const attempt = await fetchWithRetry(url, {headers: {Authorization: `Bearer ${token}`}})
  if (!('response' in attempt)) {
    return {kind: 'unreachable', detail: transportDetail(attempt.error, url)}
  }
  const response = attempt.response
  if (!response.ok) {
    return {kind: 'unreachable', detail: `HTTP ${response.status} from ${url}`}
  }
  const bytes = Buffer.from(await response.arrayBuffer())
  if (integrity && integrity.startsWith('sha512-')) {
    const computed = `sha512-${sha512b64(bytes)}`
    if (computed !== integrity) {
      // A corrupted or tampered reference must NEVER be compared: it would report DRIFT
      // for a package that is perfectly fine, or hide one that is not.
      return {kind: 'integrity', detail: `claimed ${integrity}, computed ${computed}`}
    }
  }
  return {kind: 'ok', bytes}
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3 — Build (once, whole workspace)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `quiet` redirects the CHILD's stdout to OUR stderr (fd 2) rather than discarding it.
 *
 * MEASURED before the fix: `check-package-drift.mjs --lane=branch --json` wrote 39657
 * bytes to stdout, of which the JSON document was the tail — turbo streams its whole
 * build log to the inherited stdout first, so `JSON.parse(stdout)` threw
 * `Unexpected token '•'` and --json was unusable by any machine consumer (finding X8).
 * The log is diagnostic output, not the document, so it belongs on stderr; discarding it
 * instead would make a BUILD_FAILED verdict undiagnosable from a CI log.
 */
export function runWorkspaceBuild(repoRoot, {quiet = false} = {}) {
  const rootManifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'))
  // Use the REPO'S OWN build. Never per-package: turbo's dependsOn: ["^build"] graph
  // already orders it, and N separate invocations serialise the dependency chain.
  const args = rootManifest.scripts?.build ? ['run', 'build'] : ['-r', 'run', 'build']
  const result = spawnSync('pnpm', args, {cwd: repoRoot, stdio: ['ignore', quiet ? 2 : 'inherit', 'inherit']})
  if (result.error) {
    return {ok: false, detail: `pnpm ${args.join(' ')} failed to run (${result.error.code ?? result.error.message})`}
  }
  if (result.status !== 0) {
    return {ok: false, detail: `pnpm ${args.join(' ')} exited ${result.status}`}
  }
  return {ok: true}
}

/** turbo `tasks.build.outputs`, root config plus any per-package override. */
export function declaredBuildOutputs(repoRoot, pkgPath) {
  const read = (file) => {
    if (!fs.existsSync(file)) {
      return null
    }
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\s*\/\/.*$/gm, ''))
    } catch {
      return null
    }
  }
  const patterns = []
  for (const file of [path.join(repoRoot, 'turbo.json'), path.join(pkgPath, 'turbo.json')]) {
    const outputs = read(file)?.tasks?.build?.outputs
    if (Array.isArray(outputs)) {
      patterns.push(...outputs)
    }
  }
  const include = []
  const exclude = []
  for (const raw of patterns) {
    const negated = raw.startsWith('!')
    const body = negated ? raw.slice(1) : raw
    if (body.startsWith('../')) {
      continue
    } // outside the package payload by definition
    ;(negated ? exclude : include).push(body)
  }
  return {include, exclude}
}

export function isDeclaredOutput(entryPath, outputs) {
  const matches = (pattern) => {
    if (globToRegExp(pattern).test(entryPath)) {
      return true
    }
    // A bare `dist` declares the directory and everything under it.
    const dir = pattern.replace(/\/\*\*$/, '').replace(/\/$/, '')
    return dir !== '' && !dir.includes('*') && entryPath.startsWith(`${dir}/`)
  }
  if (outputs.exclude.some(matches)) {
    return false
  }
  return outputs.include.some(matches)
}

/**
 * A build that exits 0 but leaves a declared output directory absent or empty is
 * BUILD_FAILED for that package specifically. Without this the package packs an empty
 * payload against a non-empty reference and reports DRIFT — a correct exit code for the
 * wrong reason, which is how a real cause gets misdiagnosed for months.
 *
 * The assertion is conditional and precise: a files[] entry is asserted only when some
 * task DECLARES it as an output. `config`'s four literal file entries and `web`'s `src`
 * are tracked files with no build step at all; they must not be asserted.
 */
export function assertBuildOutputs(pkgPath, filesField, outputs) {
  const missing = []
  for (const raw of filesField ?? []) {
    const entry = String(raw).replace(/\/$/, '')
    if (entry.includes('*')) {
      continue
    }
    if (!isDeclaredOutput(`${entry}/x`, outputs)) {
      continue
    }
    const abs = path.join(pkgPath, entry)
    if (!fs.existsSync(abs)) {
      missing.push(`${entry} (absent)`)
      continue
    }
    if (fs.statSync(abs).isDirectory() && fs.readdirSync(abs).length === 0) {
      missing.push(`${entry} (empty)`)
    }
  }
  return missing
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 4 — Pack the local side
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `pnpm pack`, NEVER `npm pack`. The publish path is `changeset publish` -> `pnpm
 * publish`, which rewrites `workspace:*` and `catalog:` to concrete versions. MEASURED:
 * `npm pack` leaves `"@j0nathan-ll0yd/env": "workspace:*"` and `"drizzle-orm":
 * "catalog:"` in the manifest; `pnpm pack` produces the published manifest with the
 * concrete versions. Hashing an `npm pack` payload reports every workspace package as
 * DRIFT forever. The `npmpack` self-test mutation pins this.
 */
function packOne(pkg, destDir) {
  fs.mkdirSync(destDir, {recursive: true})
  const cmd = 'pnpm'
  return new Promise((resolve) => {
    execFile(cmd, ['pack', '--pack-destination', destDir], {cwd: pkg.path, maxBuffer: 64 * 1024 * 1024}, (error, _stdout, stderr) => {
      if (error) {
        // M4: a spawn failure or a non-zero exit is INDETERMINATE, never a skip.
        const why = error.code === 'ENOENT'
          ? `${cmd} not found on PATH`
          : `${cmd} pack exited ${error.code}: ${String(stderr).trim().split('\n').slice(-3).join(' / ')}`
        resolve({ok: false, detail: why})
        return
      }
      const produced = fs.readdirSync(destDir).filter((f) => f.endsWith('.tgz'))
      if (produced.length !== 1) {
        resolve({ok: false, detail: `${cmd} pack produced ${produced.length} tarballs in ${destDir}`})
        return
      }
      resolve({ok: true, tarball: path.join(destDir, produced[0])})
    })
  })
}

async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length)
  let cursor = 0
  const runners = Array.from({length: Math.max(1, Math.min(limit, items.length))}, async () => {
    for (;;) {
      const index = cursor
      cursor += 1
      if (index >= items.length) {
        return
      }
      results[index] = await worker(items[index], index)
    }
  })
  await Promise.all(runners)
  return results
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 5 — Leak screen (the only surviving use of git)
// ─────────────────────────────────────────────────────────────────────────────

export function gitTrackedFiles(repoRoot, pkgPath) {
  const rel = path.relative(repoRoot, pkgPath) || '.'
  const result = spawnSync('git', ['ls-files', '-z', '--', rel], {cwd: repoRoot, encoding: 'buffer', maxBuffer: 64 * 1024 * 1024})
  if (result.error) {
    throw new Error(`git ls-files failed to run (${result.error.code ?? result.error.message})`)
  }
  if (result.status !== 0) {
    throw new Error(`git ls-files exited ${result.status}: ${String(result.stderr ?? '').trim()}`)
  }
  const tracked = new Set()
  for (const chunk of result.stdout.toString('utf8').split('\0')) {
    if (!chunk) {
      continue
    }
    const relative = path.posix.relative(rel === '.' ? '' : rel, chunk)
    if (relative && !relative.startsWith('..')) {
      tracked.add(relative)
    }
  }
  return tracked
}

/**
 * `pnpm pack` packs the WORKING TREE, so locally-ignored debris enters the payload.
 * MEASURED on @j0nathan-ll0yd/web: 12 files under src/components/.omc/state/** are
 * packed even though .gitignore ignores .omc/, because files: ["src"] allowlists the
 * whole subtree. Those files exist on exactly one developer's disk, so the payload
 * differs from the published one for a reason that has nothing to do with the release.
 *
 * Leaked paths are EXCLUDED from the digest so the leak surfaces as itself instead of
 * masquerading as DRIFT. In CI the rule is a structural no-op — a fresh actions/checkout
 * has no ignored debris — so it costs nothing where it is not needed.
 */
export function leakScreen(packedPaths, {tracked, outputs}) {
  const leaked = []
  for (const entry of packedPaths) {
    if (tracked.has(entry)) {
      continue
    }
    if (isDeclaredOutput(entry, outputs)) {
      continue
    }
    if (!entry.includes('/') && INJECTED_ROOT_FILE.test(entry)) {
      continue
    }
    leaked.push(entry)
  }
  return leaked.sort()
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 7 — Verdict
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PURE. The verdict is a function of the registry version set, the declared version and
 * the two digests — and of NOTHING ELSE. In particular it does not take the lane.
 *
 * M7: a verdict is never rewritten to satisfy an exit code. The previous implementation
 * rewrote a pre-existing drift's verdict to CLEAN under --base, so a machine consumer
 * reading `verdict` saw CLEAN for a drifting package. Here `verdict` is the truth and
 * `exitClass` is the only lane-dependent field — the generalisation of mantle's
 * suppressedByBase discipline. Because the reference is the registry rather than a git
 * ref, "declared version IS published but the payload differs" is ALWAYS a genuine
 * defect: `changeset publish` skips versions already in the registry, so no merge
 * sequence makes it benign and there is nothing legitimate to suppress.
 */
export function decideVerdict({declared, registryVersions, headDigest, referenceDigest}) {
  if (registryVersions.length === 0) {
    return {verdict: 'NEVER_PUBLISHED', referenceVersion: null, advisories: []}
  }
  const max = semverMax(registryVersions)
  if (registryVersions.includes(declared)) {
    return {verdict: headDigest === referenceDigest ? 'CLEAN' : 'DRIFT', referenceVersion: declared, advisories: declared === max ? [] : ['behind-registry']}
  }
  if (compareSemver(declared, max) > 0) {
    return {verdict: headDigest === referenceDigest ? 'BUMP_NOT_NEEDED' : 'PENDING_PUBLISH', referenceVersion: max, advisories: []}
  }
  return {verdict: 'VERSION_REGRESSION', referenceVersion: max, advisories: []}
}

export function exitClassFor(verdict, lane) {
  switch (verdict) {
    case 'CLEAN':
    case 'BUMP_NOT_NEEDED':
    case 'SKIPPED':
      return EXIT_OK
    case 'PENDING_PUBLISH':
    case 'NEVER_PUBLISHED':
      // On a branch this is correct: consumers still resolve the published version and
      // the pending payload is exactly what the publish workflow will ship. After that
      // workflow has run it must not persist — that is the "main is green while
      // consumers still resolve the stale tarball" window (finding H2).
      return lane === 'post-publish' ? EXIT_BLOCK : EXIT_OK
    case 'DRIFT':
    case 'VERSION_REGRESSION':
    case 'LEAKED_ARTIFACT':
      return EXIT_BLOCK
    case 'INDETERMINATE':
    case 'NO_PUBLISHABLE_PACKAGES':
      // "I could not tell" and "I inventoried nothing" are the same class of answer, and
      // NEITHER IS A PASS (A2b). Exit 3 rather than 2 because the honest statement is that
      // this gate could not evaluate anything, not that a package is broken.
      return EXIT_INDETERMINATE
    case 'BUILD_FAILED':
      return EXIT_BUILD
    default:
      throw new Error(`unknown verdict ${verdict}`)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Reference digest cache (immutable inputs only)
// ─────────────────────────────────────────────────────────────────────────────

function cacheFile(repoRoot, name, version) {
  return path.join(repoRoot, 'node_modules', '.cache', 'pkg-drift', `v${SPEC_VERSION}`, `${sha256(`${name}@${version}`)}.json`)
}

function readCache(repoRoot, name, version) {
  try {
    const parsed = JSON.parse(fs.readFileSync(cacheFile(repoRoot, name, version), 'utf8'))
    if (parsed.specVersion !== SPEC_VERSION) {
      return null
    }
    // The per-file digests are Maps in memory and plain objects on disk.
    return {strictPerFile: new Map(Object.entries(parsed.strictPerFile)), effectivePerFile: new Map(Object.entries(parsed.effectivePerFile))}
  } catch {
    return null
  }
}

function writeCache(repoRoot, name, version, {strictPerFile, effectivePerFile}) {
  try {
    const file = cacheFile(repoRoot, name, version)
    fs.mkdirSync(path.dirname(file), {recursive: true})
    fs.writeFileSync(file,
      JSON.stringify({
        specVersion: SPEC_VERSION,
        name,
        version,
        strictPerFile: Object.fromEntries(strictPerFile),
        effectivePerFile: Object.fromEntries(effectivePerFile)
      }))
  } catch {
    // A cache that cannot be written is not a gate failure.
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// The gate
// ─────────────────────────────────────────────────────────────────────────────

export async function runGate({
  repoRoot,
  registry = DEFAULT_REGISTRY,
  scope = DEFAULT_SCOPE,
  lane = 'branch',
  token = undefined,
  strictMaps = false,
  useCache = true,
  build = true,
  quiet = false,
  concurrency = 8,
  log = () => {}
}) {
  const rows = []
  const push = (row) => {
    rows.push({...row, exitClass: exitClassFor(row.verdict, lane)})
  }
  const indeterminate = (member, reason, extra = {}) =>
    push({
      name: member.name,
      path: member.path,
      declared: member.version,
      referenceVersion: null,
      verdict: 'INDETERMINATE',
      reason,
      advisories: [],
      differingFiles: [],
      leakedPaths: [],
      ...extra
    })

  // ── Step 0 — discover ─────────────────────────────────────────────────────
  let discovery
  try {
    discovery = discoverWorkspace(repoRoot)
  } catch (err) {
    // Belt and braces: discovery records per-manifest problems rather than throwing, so
    // reaching here means the tree itself is unreadable. Still not a pass.
    return {rows: [], lane, fatal: `discovery failed: ${err.message}`, exitCode: EXIT_INDETERMINATE, discoveryErrors: [], discoverySources: []}
  }
  const {members, errors: discoveryErrors, sources: discoverySources} = discovery
  // Discovery errors are "could not tell" evidence about the inventory itself, so they
  // raise the floor to exit 3 no matter how clean the packages that WERE read look.
  const finish = (extra = {}) => ({
    rows,
    lane,
    discoveryErrors,
    discoverySources,
    exitCode: Math.max(computeExit(rows), discoveryErrors.length > 0 ? EXIT_INDETERMINATE : EXIT_OK),
    ...extra
  })

  const skipReasons = []
  const publishable = []
  // Derived, not plumbed: naming any registry other than the estate default IS the
  // override. Passing the default explicitly is indistinguishable from not passing it,
  // which is the correct behaviour rather than a gap.
  const registryOverridden = registry.replace(/\/$/, '') !== DEFAULT_REGISTRY.replace(/\/$/, '')
  for (const member of members) {
    const classification = classifyMember(member, {registry, scope, registryOverridden})
    if (classification.publishable) {
      publishable.push(member)
    } else {
      // A complete census, not a filtered list: a package must never silently fall out
      // of scope because someone flipped `private` or edited publishConfig.
      const name = member.name ?? path.basename(member.path)
      const where = member.relativePath ?? (path.relative(repoRoot, member.path) || '.')
      skipReasons.push(`${name} (${where}: ${classification.reason})`)
      push({
        name,
        path: member.path,
        declared: member.version ?? null,
        referenceVersion: null,
        verdict: 'SKIPPED',
        reason: classification.reason,
        discoveredBy: member.discoveredBy,
        advisories: [],
        differingFiles: [],
        leakedPaths: []
      })
    }
  }

  if (publishable.length === 0) {
    // THE EMPTY-SET GUARD (finding D2/X1b). "I inventoried nothing" must NEVER render as
    // "all clean". This is the exact shape of the silent total pass D1 measured: on
    // mantle-LifegamesPortal the pnpm-only enumeration returned the private root alone,
    // every row was SKIPPED, and this function returned exit 0 on a repo whose
    // @j0nathan-ll0yd/portal-contract was live. The discovery fix removes that CAUSE; this
    // removes the CLASS, so the next way discovery can narrow — a deleted packages/
    // directory, a glob that stopped matching, a `private: true` added by accident — is
    // loud instead of green.
    //
    // A repo that genuinely publishes nothing does not reach here: the consumer-repo
    // wrappers answer "this repo publishes nothing, so nothing can drift" from their own
    // scan and never invoke this engine. This file ships in a repo that publishes six
    // packages, so zero is always a defect.
    push({
      name: '(workspace)',
      path: repoRoot,
      declared: null,
      referenceVersion: null,
      verdict: 'NO_PUBLISHABLE_PACKAGES',
      reason: `ZERO publishable packages were discovered — ${
        members.length === 0
          ? 'no package.json was found anywhere in this checkout'
          : `${members.length} manifest(s) were found and every one was skipped: ${skipReasons.join('; ')}`
      }. Sources consulted: declared workspace globs and a full directory scan.`,
      advisories: [],
      differingFiles: [],
      leakedPaths: []
    })
    return finish()
  }

  // ── Step 1 — auth (before any work) ───────────────────────────────────────
  let authToken = token
  let authSource = 'caller-supplied'
  if (authToken === undefined) {
    const resolved = resolveToken({registry})
    authToken = resolved.token
    authSource = resolved.source
    if (!authToken) {
      for (const member of publishable) {
        indeterminate(member,
          `no ${new URL(registry).host} token. Tried, in order: ${resolved.tried.join(', ')}. ` +
            'Fix with `gh auth login`, or export GITHUB_TOKEN=$(gh auth token).')
      }
      return finish()
    }
  }
  log(`auth: ${authSource}`)

  // ── Step 2 — packuments, in parallel, ALWAYS over the wire ────────────────
  const packuments = new Map()
  await Promise.all(publishable.map(async (member) => {
    packuments.set(member.name, await fetchPackument(registry, member.name, authToken))
  }))

  const live = []
  for (const member of publishable) {
    const result = packuments.get(member.name)
    if (result.kind === 'auth') {
      indeterminate(member, `registry rejected the token: ${result.detail}`)
    } else if (result.kind === 'unreachable') {
      indeterminate(member, `registry unreachable: ${result.detail}`)
    } else {
      live.push(member)
    }
  }
  if (live.length === 0) {
    return finish()
  }

  // ── Step 3 — build once, whole workspace ──────────────────────────────────
  if (build) {
    log('building workspace...')
    const built = runWorkspaceBuild(repoRoot, {quiet})
    if (!built.ok) {
      for (const member of live) {
        push({
          name: member.name,
          path: member.path,
          declared: member.version,
          referenceVersion: null,
          verdict: 'BUILD_FAILED',
          reason: built.detail,
          advisories: [],
          differingFiles: [],
          leakedPaths: []
        })
      }
      return finish()
    }
  }

  const ready = []
  for (const member of live) {
    const manifest = JSON.parse(fs.readFileSync(path.join(member.path, 'package.json'), 'utf8'))
    const outputs = declaredBuildOutputs(repoRoot, member.path)
    const missing = build ? assertBuildOutputs(member.path, manifest.files, outputs) : []
    if (missing.length > 0) {
      push({
        name: member.name,
        path: member.path,
        declared: member.version,
        referenceVersion: null,
        verdict: 'BUILD_FAILED',
        reason: `build exited 0 but declared output(s) missing: ${missing.join(', ')}`,
        advisories: [],
        differingFiles: [],
        leakedPaths: []
      })
      continue
    }
    ready.push({member, manifest, outputs})
  }
  if (ready.length === 0) {
    return finish()
  }

  // ── Step 4 — pack the local side ──────────────────────────────────────────
  const packRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pkg-drift-pack-'))
  try {
    const packed = await mapWithConcurrency(ready, concurrency, async (entry, index) => {
      const result = await packOne(entry.member, path.join(packRoot, String(index)))
      if (!result.ok) {
        return {entry, error: result.detail}
      }
      return {entry, bytes: fs.readFileSync(result.tarball)}
    })

    // ── Steps 5–7, per package ──────────────────────────────────────────────
    for (const {entry, bytes, error} of packed) {
      const {member, outputs} = entry
      if (error) {
        indeterminate(member, `local pack failed: ${error}`)
        continue
      }

      let headFiles
      try {
        headFiles = readTarball(bytes)
      } catch (err) {
        indeterminate(member, `unreadable local tarball: ${err.message}`)
        continue
      }

      // Step 5 — leak screen
      let leaked = []
      try {
        leaked = leakScreen([...headFiles.keys()], {tracked: gitTrackedFiles(repoRoot, member.path), outputs})
      } catch (err) {
        indeterminate(member, `leak screen could not read git: ${err.message}`)
        continue
      }
      const leakedSet = new Set(leaked)

      // --strict-maps compares every packed file, including maps no consumer can
      // resolve; the default drops those from the comparison but still reports them.
      const head = payloadDigests(headFiles, leakedSet)
      const headDeadMaps = strictMaps ? [] : head.deadMaps
      const headEffectivePerFile = strictMaps ? head.strictEntries : head.effectiveEntries
      const strictDigest = head.strictDigest
      const effectiveDigest = strictMaps ? head.strictDigest : head.effectiveDigest

      if (leaked.length > 0) {
        push({
          name: member.name,
          path: member.path,
          declared: member.version,
          referenceVersion: null,
          verdict: 'LEAKED_ARTIFACT',
          reason: `${leaked.length} packed path(s) are neither git-tracked, nor under a declared ` +
            'turbo build output, nor an npm-injected root file. Declare the directory in ' +
            'turbo.json `outputs` or track the files — do NOT simply delete them if they ' +
            'are a real build product.',
          advisories: [],
          differingFiles: [],
          leakedPaths: leaked,
          strictDigest,
          effectiveDigest,
          referenceDigest: null
        })
        continue
      }

      // Step 6 — reference payload
      const packument = packuments.get(member.name)
      const registryVersions = Object.keys(packument.versions ?? {})
      let reference = null
      let referenceFailed = false
      if (registryVersions.length > 0) {
        const referenceVersion = registryVersions.includes(member.version)
          ? member.version
          : semverMax(registryVersions)
        const cached = useCache ? readCache(repoRoot, member.name, referenceVersion) : null
        if (cached) {
          reference = {version: referenceVersion, ...cached}
        } else {
          const dist = packument.versions[referenceVersion]?.dist ?? {}
          const downloaded = await fetchTarball(dist.tarball, authToken, dist.integrity)
          if (downloaded.kind !== 'ok') {
            indeterminate(member, downloaded.kind === 'integrity'
              ? `reference tarball failed its dist.integrity check: ${downloaded.detail}`
              : `reference tarball unreachable: ${downloaded.detail}`, {referenceVersion, strictDigest, effectiveDigest})
            referenceFailed = true
          } else {
            let refFiles
            try {
              refFiles = readTarball(downloaded.bytes)
            } catch (err) {
              indeterminate(member, `unreadable reference tarball: ${err.message}`, {referenceVersion, strictDigest, effectiveDigest})
              referenceFailed = true
            }
            if (!referenceFailed) {
              const ref = payloadDigests(refFiles)
              reference = {version: referenceVersion, strictPerFile: ref.strictEntries, effectivePerFile: ref.effectiveEntries}
              // Only the immutable published payload is cached; the packument never is,
              // so registry reachability is re-proven on every single run.
              if (useCache) {
                writeCache(repoRoot, member.name, referenceVersion, {strictPerFile: reference.strictPerFile, effectivePerFile: reference.effectivePerFile})
              }
            }
          }
        }
      }
      if (referenceFailed) {
        continue
      }

      const refCompare = reference ? (strictMaps ? reference.strictPerFile : reference.effectivePerFile) : null
      const refDigest = refCompare ? digestOf(refCompare) : null
      const headDigest = effectiveDigest

      const decision = decideVerdict({declared: member.version, registryVersions, headDigest, referenceDigest: refDigest})

      const advisories = [...decision.advisories]
      if (!strictMaps && strictDigest !== effectiveDigest) {
        advisories.push('cosmetic-only')
      }

      push({
        name: member.name,
        path: member.path,
        declared: member.version,
        referenceVersion: decision.referenceVersion,
        verdict: decision.verdict,
        advisories,
        differingFiles: refCompare ? differingFiles(headEffectivePerFile, refCompare) : [],
        cosmeticPaths: [...headDeadMaps].sort(),
        leakedPaths: [],
        strictDigest,
        effectiveDigest,
        referenceDigest: refCompare ? digestOf(refCompare) : null
      })
    }
  } finally {
    fs.rmSync(packRoot, {recursive: true, force: true})
  }

  return finish()
}

function computeExit(rows) {
  return rows.reduce((worst, row) => Math.max(worst, row.exitClass ?? 0), EXIT_OK)
}

// ─────────────────────────────────────────────────────────────────────────────
// Reporting
// ─────────────────────────────────────────────────────────────────────────────

function report(result) {
  if (result.fatal) {
    console.error(`FATAL: ${result.fatal}`)
    return
  }
  const evaluated = result.rows.filter((r) => r.verdict !== 'SKIPPED')
  const skipped = result.rows.filter((r) => r.verdict === 'SKIPPED')

  console.log(`\npackage payload drift — lane=${result.lane}, spec v${SPEC_VERSION}\n`)
  for (const row of evaluated) {
    const ref = row.referenceVersion ? ` ref=${row.referenceVersion}` : ''
    const adv = row.advisories?.length ? `  [${row.advisories.join(', ')}]` : ''
    console.log(`  ${row.verdict.padEnd(19)} ${row.name}  declared=${row.declared}${ref}${adv}`)
    if (row.reason) {
      console.log(`      ${row.reason}`)
    }
    for (const file of row.differingFiles ?? []) {
      console.log(`      differs: ${file}`)
    }
    for (const file of row.leakedPaths ?? []) {
      console.log(`      leaked:  ${file}`)
    }
    if (row.advisories?.includes('cosmetic-only')) {
      for (const file of row.cosmeticPaths ?? []) {
        console.log(`      cosmetic (unresolvable map, excluded from the verdict): ${file}`)
      }
    }
  }
  if (skipped.length > 0) {
    console.log('\n  census (not published):')
    for (const row of skipped) {
      console.log(`    SKIPPED  ${row.name} — ${row.reason}`)
    }
  }

  // An unreadable manifest is a hole in the INVENTORY, not in a package, so it is
  // reported separately and raises the exit floor on its own (it can be the only reason
  // this run is not exit 0).
  if (result.discoveryErrors?.length) {
    console.log('\n  discovery errors (the inventory is incomplete — this is why the exit floor is 3):')
    for (const error of result.discoveryErrors) {
      console.log(`    ${error}`)
    }
  }

  const counts = {}
  for (const row of evaluated) {
    counts[row.verdict] = (counts[row.verdict] ?? 0) + 1
  }
  const summary = Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', ') || 'nothing evaluated'
  const publishableCount = evaluated.filter((r) => r.verdict !== 'NO_PUBLISHABLE_PACKAGES').length
  console.log(`\n  ${publishableCount} publishable package(s): ${summary}`)
  if (result.discoverySources?.length) {
    console.log(`  discovered via: ${result.discoverySources.join(', ')}`)
  }
  console.log(`  exit ${result.exitCode}\n`)
}

// ─────────────────────────────────────────────────────────────────────────────
// Self-test — a THROWAWAY GIT REPO and a REAL, OFFLINE REGISTRY. No stubbed seams.
//
// The previous generation's --self-test fed `historyComplete` in as an INPUT rather
// than deriving it from a real repository, so the entire I/O layer was untested: a
// mutation that collapsed the two-point diff to `<head> <head>` made the gate report
// "17 clean" on a tree with two real drifts while --self-test printed "self-test
// passed" and the unit suite went green (finding H1). This suite exercises the shipped
// code path end to end — pnpm pack, fetch(), git ls-files, untar, hash — and every
// mutant below must make a NAMED scenario go red, or --self-test itself fails.
// ─────────────────────────────────────────────────────────────────────────────

/** ~50 lines of node:http implementing the two routes a real npm client needs. */
function startToyRegistry() {
  const packages = new Map() // name -> Map<version, {tarball: Buffer, integrity: string}>
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1')
    const tarMatch = /^\/-\/tarball\/(.+)$/.exec(url.pathname)
    if (tarMatch) {
      const [name, version] = decodeURIComponent(tarMatch[1]).split('|')
      const entry = packages.get(name)?.get(version)
      if (!entry) {
        res.writeHead(404).end('{}')
        return
      }
      res.writeHead(200, {'content-type': 'application/octet-stream'}).end(entry.tarball)
      return
    }
    const name = decodeURIComponent(url.pathname.slice(1))
    const versions = packages.get(name)
    if (!versions || versions.size === 0) {
      res.writeHead(404, {'content-type': 'application/json'}).end('{"error":"Not found"}')
      return
    }
    const body = {name, versions: {}}
    for (const [version, entry] of versions) {
      body.versions[version] = {
        name,
        version,
        dist: {tarball: `http://127.0.0.1:${server.address().port}/-/tarball/${encodeURIComponent(`${name}|${version}`)}`, integrity: entry.integrity}
      }
    }
    res.writeHead(200, {'content-type': 'application/json'}).end(JSON.stringify(body))
  })
  return {
    listen: () =>
      new Promise((resolve) => {
        server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`))
      }),
    publish(name, version, tarball, {corrupt = false} = {}) {
      if (!packages.has(name)) {
        packages.set(name, new Map())
      }
      const integrity = corrupt
        ? `sha512-${sha512b64(Buffer.concat([tarball, Buffer.from('tamper')]))}`
        : `sha512-${sha512b64(tarball)}`
      packages.get(name).set(version, {tarball, integrity})
    },
    close: () =>
      new Promise((resolve) => {
        if (!server.listening) {
          resolve()
          return
        }
        server.closeAllConnections?.()
        server.close(resolve)
      })
  }
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), {recursive: true})
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`)
}

function git(cwd, ...args) {
  const result = spawnSync('git', args, {cwd, encoding: 'utf8'})
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`)
  }
  return result.stdout
}

const BUILD_JS = 'const fs = require("fs")\nfs.mkdirSync("dist", {recursive: true})\n' + 'fs.copyFileSync("src/index.js", "dist/index.js")\n'

function buildFixture(registryUrl) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'pkg-drift-selftest-')))
  fs.mkdirSync(path.join(root, 'packages', 'leaf', 'src'), {recursive: true})
  fs.mkdirSync(path.join(root, 'packages', 'dependent', 'src'), {recursive: true})

  fs.writeFileSync(path.join(root, 'pnpm-workspace.yaml'), "packages:\n  - 'packages/*'\n")
  fs.writeFileSync(path.join(root, '.gitignore'), 'dist/\nnode_modules/\n')
  fs.writeFileSync(path.join(root, 'build.js'), BUILD_JS)
  writeJson(path.join(root, 'package.json'), {name: 'drift-selftest-root', private: true, version: '0.0.0', scripts: {build: 'pnpm -r run build'}})
  // Real config data, not a stub: the leak screen reads `outputs` from here, which is
  // how a gitignored dist/ is distinguished from genuine debris.
  writeJson(path.join(root, 'turbo.json'), {tasks: {build: {outputs: ['dist/**']}}})

  writeJson(path.join(root, 'packages', 'leaf', 'package.json'), {
    name: '@toy/leaf',
    version: '1.0.0',
    files: ['dist'],
    publishConfig: {registry: registryUrl},
    scripts: {build: 'node ../../build.js'}
  })
  writeJson(path.join(root, 'packages', 'dependent', 'package.json'), {
    name: '@toy/dependent',
    version: '1.0.0',
    files: ['dist'],
    dependencies: {'@toy/leaf': 'workspace:*'},
    publishConfig: {registry: registryUrl},
    scripts: {build: 'node ../../build.js'}
  })
  fs.writeFileSync(path.join(root, 'packages', 'leaf', 'src', 'index.js'), 'module.exports = 1\n')
  fs.writeFileSync(path.join(root, 'packages', 'dependent', 'src', 'index.js'), 'module.exports = 2\n')

  git(root, 'init', '-q')
  git(root, 'config', 'user.email', 'selftest@example.invalid')
  git(root, 'config', 'user.name', 'drift self-test')
  git(root, 'add', '-A')
  git(root, 'commit', '-qm', 'fixture')
  return root
}

/**
 * A workspace with NOTHING publishable, for the S19 empty-set rung.
 *
 * Deliberately a SEPARATE repo rather than a mutation of the main fixture: S19 asserts
 * what the gate does when its inventory comes back empty, and reaching that state by
 * flipping the main fixture's manifests would leave every later rung reasoning about a
 * tree that had been temporarily gutted.
 */
function buildEmptyFixture() {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'pkg-drift-empty-')))
  fs.mkdirSync(path.join(root, 'packages', 'internal'), {recursive: true})
  fs.writeFileSync(path.join(root, 'pnpm-workspace.yaml'), "packages:\n  - 'packages/*'\n")
  writeJson(path.join(root, 'package.json'), {name: 'drift-empty-root', private: true, version: '0.0.0'})
  writeJson(path.join(root, 'packages', 'internal', 'package.json'), {name: '@toy/internal', private: true, version: '1.0.0'})
  git(root, 'init', '-q')
  git(root, 'config', 'user.email', 'selftest@example.invalid')
  git(root, 'config', 'user.name', 'drift self-test')
  git(root, 'add', '-A')
  git(root, 'commit', '-qm', 'empty fixture')
  return root
}

/**
 * A workspace whose inventory is PARTLY unreadable, for the S20 discovery-floor rung.
 *
 * The mix is the whole point. One READABLE, publishable package keeps `computeExit(rows)`
 * at 0, so the only thing that can lift the process out of green is the discovery floor
 * itself; one manifest that exists and cannot be parsed puts an entry in
 * `discovery.errors`. A fixture whose readable half already blocked would assert nothing —
 * the floor would be invisible underneath a verdict that exits non-zero anyway, which is
 * exactly how the floor clause in `finish()` could be deleted outright while all 13
 * mutations stayed killed and the suite reported baseline green.
 *
 * The broken manifest is truncated mid-object rather than empty or absent: that is the
 * shape a half-written, interrupted or merge-conflicted `package.json` actually has on
 * disk, and it is the one shape that reaches the `JSON.parse` catch in discoverWorkspace
 * instead of being skipped earlier as "no manifest here".
 */
function buildUnreadableManifestFixture() {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'pkg-drift-unreadable-')))
  fs.mkdirSync(path.join(root, 'packages', 'readable', 'src'), {recursive: true})
  fs.mkdirSync(path.join(root, 'packages', 'unreadable'), {recursive: true})
  fs.writeFileSync(path.join(root, 'pnpm-workspace.yaml'), "packages:\n  - 'packages/*'\n")
  writeJson(path.join(root, 'package.json'), {name: 'drift-unreadable-root', private: true, version: '0.0.0'})
  writeJson(path.join(root, 'packages', 'readable', 'package.json'), {name: '@toy/readable', version: '1.0.0', files: ['src']})
  fs.writeFileSync(path.join(root, 'packages', 'readable', 'src', 'index.js'), 'module.exports = "readable"\n')
  fs.writeFileSync(path.join(root, 'packages', 'unreadable', 'package.json'), '{"name": "@toy/unreadable", "version":\n')
  git(root, 'init', '-q')
  git(root, 'config', 'user.email', 'selftest@example.invalid')
  git(root, 'config', 'user.name', 'drift self-test')
  git(root, 'add', '-A')
  git(root, 'commit', '-qm', 'unreadable-manifest fixture')
  return root
}

async function packFixtureAt(root, relDir) {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'pkg-drift-seed-'))
  const result = await packOne({path: path.join(root, relDir)}, dest)
  if (!result.ok) {
    throw new Error(`fixture pack failed: ${result.detail}`)
  }
  const bytes = fs.readFileSync(result.tarball)
  fs.rmSync(dest, {recursive: true, force: true})
  return bytes
}

const packFixture = (root, pkgDir) => packFixtureAt(root, path.join('packages', pkgDir))

/**
 * Seeds the toy registry the way `npm publish` does, NOT the way `pnpm publish` does.
 * MEASURED: `npm pack` applies no manifest transform at all, so the seeded tarball keeps
 * every lifecycle script — which is exactly the shape of the real published
 * @j0nathan-ll0yd/portal-contract@1.0.0 and of this repo's own packages/config
 * (.github/workflows/publish-config.yml runs `npm publish`). S14 uses it to reproduce the
 * X3 false positive end to end rather than only in the pure conformance vectors.
 */
function npmPackFixture(root, pkgDir) {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'pkg-drift-npmseed-'))
  const result = spawnSync('npm', ['pack', '--pack-destination', dest], {
    cwd: path.join(root, 'packages', pkgDir),
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024
  })
  if (result.status !== 0) {
    throw new Error(`npm pack failed: ${String(result.stderr).trim()}`)
  }
  const produced = fs.readdirSync(dest).filter((f) => f.endsWith('.tgz'))
  if (produced.length !== 1) {
    throw new Error(`npm pack produced ${produced.length} tarballs`)
  }
  const bytes = fs.readFileSync(path.join(dest, produced[0]))
  fs.rmSync(dest, {recursive: true, force: true})
  return bytes
}

function setVersion(root, pkgDir, version) {
  const file = path.join(root, 'packages', pkgDir, 'package.json')
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8'))
  manifest.version = version
  writeJson(file, manifest)
}

function commitAll(root, message) {
  git(root, 'add', '-A')
  git(root, 'commit', '-qm', message)
}

const row = (result, name) => result.rows.find((r) => r.name === name)

const STOP = Symbol('self-test-stop')

/**
 * Does assertion `id` belong to `scenario`? MATCHING IS AT A TOKEN BOUNDARY, NOT A BARE
 * PREFIX — a scenario matches its own rungs and no others.
 *
 * A bare `id.startsWith(scenario)` disarms a mutation the moment someone adds a rung whose
 * id merely BEGINS with an existing scenario name. MEASURED while adding S20/S21: `selfref`
 * (scenario 'S2') stopped the ladder at "S20 ..." — which passes, because selfref does not
 * break it — so the ladder unwound before ever reaching "S2 payload change with no bump"
 * and the headline mutation of this whole file was reported SURVIVED. The numbering makes
 * that a standing trap: S3x collides with S3, S1x with S1, and so on for every rung yet to
 * be written. Requiring end-of-string or a following space removes the trap at the source
 * rather than by rationing which numbers may be used next.
 */
const matchesScenario = (id, scenario) => id === scenario || id.startsWith(`${scenario} `)

/**
 * `stopAfter` unwinds the ladder as soon as the named scenario has been evaluated. It
 * exists only so a mutant run costs the rungs up to its target rather than all of them;
 * the BASELINE run never sets it, so every scenario is always exercised.
 */
async function runSelfTest({mutation = null, verbose = true, stopAfter = null} = {}) {
  const registry = startToyRegistry()
  const registryUrl = await registry.listen()
  const root = buildFixture(registryUrl)
  const failures = []
  const say = (line) => {
    if (verbose) {
      console.log(line)
    }
  }

  // The suite runs against a PATCHED COPY of this file, never against a branch inside it.
  // `scriptPath` is what S13 spawns, so the process-exit boundary is exercised on the same
  // artifact every other scenario evaluates in-process.
  const mutantDir = mutation ? fs.mkdtempSync(path.join(os.tmpdir(), 'pkg-drift-mutation-')) : null
  const scriptPath = mutation ? writeMutatedScript(mutation, mutantDir) : fileURLToPath(import.meta.url)
  const evaluator = mutation ? await import(pathToFileURL(scriptPath).href) : {runGate}

  const gate = (overrides = {}) =>
    evaluator.runGate({repoRoot: root, registry: registryUrl, scope: '@toy', token: 'selftest-token', useCache: false, concurrency: 2, ...overrides})

  /**
   * THE PROCESS-EXIT BOUNDARY, as a reusable rung (findings X2 and D3).
   *
   * Every `gate()` assertion above reads runGate's RETURN VALUE; not one of them observes
   * what the process actually does. The four lines that turn a report into an exit status
   * are reachable only from here — and a single rung asserting DRIFT -> 2 was not enough:
   * ANY exit-mapping mutation that happens to preserve 2 stayed invisible, so
   * `process.exitCode = 2` (block everything) and `code === 3 ? 0 : code` (launder every
   * "could not tell" into a pass) both survived a fully green suite. The mapping is now
   * pinned in BOTH directions, by spawning at a CLEAN state (must be 0) and at two
   * distinct exit-3 states (must be 3) as well as at a drift (must be 2).
   *
   * ASYNCHRONOUSLY, deliberately. The toy registry is an http server on THIS process's
   * event loop, so a synchronous spawnSync would block it and the child's packument fetch
   * would time out — the child would report INDETERMINATE for a reason that has nothing to
   * do with the code under test. (Measured: UND_ERR_HEADERS_TIMEOUT, and the half-open
   * socket then poisoned the next in-process rung with ECONNRESET.)
   */
  const spawnGate = (extraArgs = [], {repoRoot = root, registryArg = registryUrl} = {}) =>
    new Promise((resolve) => {
      execFile(process.execPath, [
        scriptPath,
        '--lane=branch',
        `--repo-root=${repoRoot}`,
        `--registry=${registryArg}`,
        '--scope=@toy',
        '--no-cache',
        '--no-build',
        '--json',
        ...extraArgs
      ], {encoding: 'utf8', env: {...process.env, DRIFT_REGISTRY_TOKEN: 'selftest-token'}, maxBuffer: 64 * 1024 * 1024}, (error, stdout, stderr) => {
        let doc = null
        try {
          doc = JSON.parse(stdout)
        } catch (err) {
          doc = {parseError: err.message}
        }
        resolve({status: error ? (typeof error.code === 'number' ? error.code : null) : 0, signal: error?.signal ?? null, stdout, stderr, doc})
      })
    })

  const spawnTail = (run) =>
    `spawned exit=${run.status} signal=${run.signal ?? 'none'} verdicts=${
      JSON.stringify((run.doc?.rows ?? []).map((r) => `${r.name}:${r.verdict}`))
    } stderr=${String(run.stderr).trim().split('\n').slice(-3).join(' / ')}`

  const check = (id, ok, detail) => {
    if (ok) {
      say(`  ok    ${id}`)
    } else {
      say(`  FAIL  ${id} — ${detail}`)
      failures.push(`${id} — ${detail}`)
    }
    if (stopAfter && matchesScenario(id, stopAfter)) {
      throw STOP
    }
  }
  /**
   * Asserts the ROW's verdict and its lane-resolved exitClass, plus that the process
   * exit code is at least as severe. The fixture holds two packages that legitimately
   * sit in different states at the same rung (the cascade puts the dependent in DRIFT
   * while the leaf is PENDING_PUBLISH), so asserting the process code exactly would be
   * asserting the wrong thing.
   */
  const expect = (id, result, name, verdict, exitClass) => {
    const found = row(result, name)
    const got = found
      ? `${found.verdict}/class=${found.exitClass}/process=${result.exitCode}${found.reason ? ` — ${found.reason}` : ''}`
      : `<no row for ${name}>`
    check(id, found?.verdict === verdict && found?.exitClass === exitClass && result.exitCode >= exitClass,
      `expected ${verdict}/class=${exitClass}, got ${got}`)
  }

  try {
    // S0 — a registry that is not listening at all, before any state exists. This is
    // the cheap, deterministic half of the transport proof; S5 repeats it against a
    // registry that was alive and then died mid-session.
    let result = await gate({registry: 'http://127.0.0.1:1/'})
    expect('S0 unreachable registry is INDETERMINATE', result, '@toy/leaf', 'INDETERMINATE', 3)

    // S1 — seed both packages as published 1.0.0. Expect CLEAN.
    const built = runWorkspaceBuild(root)
    if (!built.ok) {
      throw new Error(`fixture build failed: ${built.detail}`)
    }
    registry.publish('@toy/leaf', '1.0.0', await packFixture(root, 'leaf'))
    registry.publish('@toy/dependent', '1.0.0', await packFixture(root, 'dependent'))
    result = await gate()
    expect('S1 clean baseline (leaf)', result, '@toy/leaf', 'CLEAN', 0)
    expect('S1 clean baseline (dependent)', result, '@toy/dependent', 'CLEAN', 0)

    // S1b — manifest KEY ORDER must not change the verdict. The reference is packed
    // from a manifest whose top-level keys are in a different order; every key and
    // value is identical. MEASURED on a real workspace: pnpm reinserts keys in the
    // order it finishes resolving them, so this divergence occurs in production
    // between two runs of the same unedited tree. Canonicalisation is what makes the
    // comparison possible at all; without it every package DRIFTs at random.
    const depManifestPath = path.join(root, 'packages', 'dependent', 'package.json')
    const originalManifest = fs.readFileSync(depManifestPath, 'utf8')
    const shuffled = {}
    for (const key of Object.keys(JSON.parse(originalManifest)).reverse()) {
      shuffled[key] = JSON.parse(originalManifest)[key]
    }
    writeJson(depManifestPath, shuffled)
    registry.publish('@toy/dependent', '1.0.0', await packFixture(root, 'dependent'))
    fs.writeFileSync(depManifestPath, originalManifest)
    result = await gate({build: false})
    expect('S1b manifest key order does not change the verdict', result, '@toy/dependent', 'CLEAN', 0)
    registry.publish('@toy/dependent', '1.0.0', await packFixture(root, 'dependent'))

    // S12 — the reference-digest cache must be a no-op on the verdict.
    const cold = await gate({useCache: true})
    const warm = await gate({useCache: true})
    check('S12 reference cache does not change the verdict',
      row(cold, '@toy/leaf').verdict === 'CLEAN' &&
        row(warm, '@toy/leaf').verdict === 'CLEAN' &&
        row(cold, '@toy/leaf').referenceDigest === row(warm, '@toy/leaf').referenceDigest, 'warm cache changed the verdict or the reference digest')

    // S17 — SPAWNED, AT A CLEAN TREE: the process MUST exit 0 (finding D3).
    // The negative control for the whole exit boundary. Without it a gate hard-wired to a
    // blocking status passes every other spawned assertion in this file while being
    // useless — `process.exitCode = 2` is a one-token edit that S13 below cannot see,
    // because S13 expects 2 anyway. The `exitalways2` mutation is exactly that edit.
    const cleanRun = await spawnGate()
    check('S17 the real process exits 0 at a clean tree', cleanRun.status === 0, spawnTail(cleanRun))
    check('S17 the spawned document agrees the tree is clean', cleanRun.doc?.rows?.find((r) =>
          r.name === '@toy/leaf'
        )?.verdict === 'CLEAN' && cleanRun.doc?.exitCode === 0, spawnTail(cleanRun))

    // S18 — SPAWNED, AGAINST A DEAD REGISTRY: the process MUST exit 3 (finding D3).
    // "Could not tell" is not a pass (A2b), and until now that rule was only ever asserted
    // on runGate's RETURN VALUE (S0, S5, S11). Nothing checked that exit 3 survives the
    // process boundary, so `code === 3 ? 0 : code` — the single most dangerous edit this
    // file admits, because it launders every unknown into green while DRIFT still blocks —
    // left the entire suite passing. The `exitlaunder3` mutation is exactly that edit.
    const deadRun = await spawnGate([], {registryArg: 'http://127.0.0.1:1/'})
    check('S18 the real process exits 3 when the registry is unreachable', deadRun.status === 3, spawnTail(deadRun))
    check('S18 the spawned document says INDETERMINATE, not CLEAN', deadRun.doc?.rows?.some((r) => r.verdict === 'INDETERMINATE') === true,
      spawnTail(deadRun))

    // S19 — SPAWNED, AT A WORKSPACE WITH NOTHING PUBLISHABLE: exit 3 (findings D2/X1b).
    // "I inventoried nothing" must never render as "all clean". This is the shape of the
    // silent total pass D1 measured on mantle-LifegamesPortal: every row SKIPPED, zero
    // publishable, exit 0, on a repo with a live published package. The `emptyset`
    // mutation removes the guard and only this rung notices.
    const emptyRoot = buildEmptyFixture()
    try {
      const emptyRun = await spawnGate([], {repoRoot: emptyRoot})
      check('S19 the real process exits 3 when nothing publishable is discovered', emptyRun.status === 3, spawnTail(emptyRun))
      check('S19 the document names the verdict rather than reporting an empty pass', emptyRun.doc?.rows?.some((r) =>
        r.verdict === 'NO_PUBLISHABLE_PACKAGES'
      ) === true, spawnTail(emptyRun))
      check('S19 the verdict enumerates every manifest found and why each was skipped',
        /@toy\/internal/.test(emptyRun.doc?.rows?.find((r) => r.verdict === 'NO_PUBLISHABLE_PACKAGES')?.reason ?? ''), spawnTail(emptyRun))
    } finally {
      fs.rmSync(emptyRoot, {recursive: true, force: true})
    }

    // S20 — SPAWNED, WITH HALF THE INVENTORY UNREADABLE: exit 3 (finding A4).
    //
    // The doc comment on discoverWorkspace promises that manifests which exist and cannot
    // be read "raise the exit floor to INDETERMINATE rather than vanishing", and `finish()`
    // implements it in one clause. NOTHING pinned that clause. Deleting it outright —
    // `Math.max(computeExit(rows), EXIT_OK)` — left this suite reporting "baseline green,
    // all 13 mutations killed", exit 0 (measured). That is the A2b silent pass one level
    // below the verdict logic: every row the gate MANAGED to read is clean, so it reports a
    // pass while a package it could not read at all sits unevaluated beside them.
    //
    // The fixture is deliberately mixed — one readable package (NEVER_PUBLISHED, exit class
    // 0) and one truncated manifest — so the ONLY thing that can lift this run off 0 is the
    // floor. The `discoveryfloor` mutation removes it and only this rung notices.
    const partialRoot = buildUnreadableManifestFixture()
    try {
      const partialRun = await spawnGate([], {repoRoot: partialRoot})
      check('S20 the real process exits 3 when a manifest could not be read', partialRun.status === 3, spawnTail(partialRun))
      check('S20 the readable half is clean, so ONLY the discovery floor can be lifting this run', (partialRun.doc?.rows ?? []).every((r) =>
        (r.exitClass ?? 0) === 0
      ), `a row already blocks, so this rung would pass with no floor at all — rows=${
        JSON.stringify((partialRun.doc?.rows ?? []).map((r) => `${r.name}:${r.verdict}:${r.exitClass}`))
      }`)
      check('S20 the document names the manifest it could not read rather than dropping it', (partialRun.doc?.discoveryErrors ?? []).some((e) =>
        /packages\/unreadable\/package\.json/.test(e)
      ), `discoveryErrors=${JSON.stringify(partialRun.doc?.discoveryErrors)}`)
    } finally {
      fs.rmSync(partialRoot, {recursive: true, force: true})
    }

    // S21 — A GITIGNORED MANIFEST IS NOT PART OF THE INVENTORY (finding A4, LOW half).
    //
    // Discovery scans the whole tree, so it finds `package.json` files git was told to
    // ignore: vendored copies, scaffolding scratch, extracted tarballs. Subtracting them is
    // one `.filter()` in discoverWorkspace, and neutering it (measured, via an empty ignore
    // set so every existing anchor stayed intact) left the whole suite green.
    //
    // The consequence is not cosmetic. This rung publishes @toy/ghost from a tree git
    // ignores and then edits it WITHOUT republishing, so an inventory that fails to
    // subtract it lands a blocking verdict — the ignored copy's payload no longer matches
    // the registry, and its files are untracked inside its own files[] allowlist — and the
    // gate blocks every push in a repo whose tracked contents are entirely clean.
    fs.mkdirSync(path.join(root, 'vendor', 'ghost', 'src'), {recursive: true})
    writeJson(path.join(root, 'vendor', 'ghost', 'package.json'), {
      name: '@toy/ghost',
      version: '1.0.0',
      files: ['src'],
      publishConfig: {registry: registryUrl}
    })
    fs.writeFileSync(path.join(root, 'vendor', 'ghost', 'src', 'index.js'), 'module.exports = "published"\n')
    fs.appendFileSync(path.join(root, '.gitignore'), 'vendor/\n')
    commitAll(root, 'ignore the vendored tree')
    registry.publish('@toy/ghost', '1.0.0', await packFixtureAt(root, path.join('vendor', 'ghost')))
    fs.writeFileSync(path.join(root, 'vendor', 'ghost', 'src', 'index.js'), 'module.exports = "edited, never republished"\n')

    result = await gate({build: false})
    check('S21 a manifest git ignores is not inventoried', row(result, '@toy/ghost') === undefined,
      `an ignored tree was evaluated as a package — rows=${JSON.stringify(result.rows.map((r) => `${r.name}:${r.verdict}`))}`)
    check('S21 an ignored tree cannot move the exit status of a clean checkout', result.exitCode === 0,
      `exitCode=${result.exitCode} on a tracked tree that is entirely clean — rows=${
        JSON.stringify(result.rows.map((r) => `${r.name}:${r.verdict}:${r.exitClass}`))
      }`)
    fs.rmSync(path.join(root, 'vendor'), {recursive: true, force: true})

    // S2 — payload change, NO bump. THE headline case.
    fs.writeFileSync(path.join(root, 'packages', 'leaf', 'src', 'index.js'), 'module.exports = 11\n')
    commitAll(root, 'edit leaf')
    result = await gate()
    expect('S2 payload change with no bump', result, '@toy/leaf', 'DRIFT', 2)
    check('S2 names the differing payload path', (row(result, '@toy/leaf').differingFiles ?? []).includes('dist/index.js'),
      `differingFiles=${JSON.stringify(row(result, '@toy/leaf').differingFiles)}`)

    // S13 — SPAWNED, AT A REAL DRIFT: the process MUST exit 2 (finding X2). The original
    // exit-boundary rung, and still the one that proves a blocking verdict actually
    // blocks; S17/S18/S19 above pin the other three exit classes so that no exit-mapping
    // edit which merely PRESERVES 2 can hide behind it (finding D3).
    //
    // It doubles as the X8 regression: --json must put THE DOCUMENT AND NOTHING ELSE on
    // stdout. Before the fix, turbo's build log preceded it and JSON.parse threw.
    const spawned = await spawnGate()
    check('S13 the real process exits 2 on a real drift', spawned.status === 2, spawnTail(spawned))
    const spawnedDoc = spawned.doc
    check('S13 --json stdout is a parseable document and nothing else (X8)', spawnedDoc?.parseError === undefined,
      `JSON.parse(stdout) failed: ${spawnedDoc?.parseError} — first 80 bytes ${JSON.stringify(spawned.stdout.slice(0, 80))}`)
    const spawnedLeaf = spawnedDoc?.rows?.find((r) => r.name === '@toy/leaf')
    check('S13 the spawned document agrees with the in-process verdict', spawnedLeaf?.verdict === 'DRIFT' && spawnedDoc?.exitCode === 2,
      `document reported ${JSON.stringify(spawnedLeaf?.verdict)} / exitCode ${spawnedDoc?.exitCode}${spawnedLeaf?.reason ? ` — ${spawnedLeaf.reason}` : ''}`)
    check('S13 the document declares the digest spec version it was produced under', spawnedDoc?.specVersion === SPEC_VERSION,
      `specVersion=${spawnedDoc?.specVersion}, expected ${SPEC_VERSION}`)

    // S3 — bump to an unpublished version.
    setVersion(root, 'leaf', '1.0.1')
    commitAll(root, 'bump leaf')
    result = await gate()
    expect('S3 bumped but not yet published', result, '@toy/leaf', 'PENDING_PUBLISH', 0)

    // S3b — H2: the same state must BLOCK once the publish workflow has run.
    result = await gate({lane: 'post-publish'})
    expect('S3b post-publish lane blocks PENDING_PUBLISH', result, '@toy/leaf', 'PENDING_PUBLISH', 2)
    check('S3b the lane never rewrites the verdict (M7)', row(result, '@toy/leaf').verdict === 'PENDING_PUBLISH' && row(result, '@toy/leaf').exitClass === 2,
      'lane leaked into the verdict field')

    // S7 — the workspace-dependency cascade. Publish leaf 1.0.1 and leave the
    // dependent at its published 1.0.0: no file under packages/dependent changed, only
    // pnpm's workspace-protocol rewrite moved. A path-based gate cannot see this.
    registry.publish('@toy/leaf', '1.0.1', await packFixture(root, 'leaf'))
    result = await gate()
    expect('S7 workspace-dependency cascade', result, '@toy/dependent', 'DRIFT', 2)
    check('S7 cascade names package.json as the differing file', (row(result, '@toy/dependent').differingFiles ?? []).includes('package.json'),
      `differingFiles=${JSON.stringify(row(result, '@toy/dependent').differingFiles)}`)

    setVersion(root, 'dependent', '1.0.1')
    commitAll(root, 'bump dependent')
    registry.publish('@toy/dependent', '1.0.1', await packFixture(root, 'dependent'))
    result = await gate()
    expect('S7b cascade resolved by bump + publish', result, '@toy/dependent', 'CLEAN', 0)

    // S14 — THE X3 REGRESSION, END TO END. A package whose registry copy was uploaded by
    // `npm publish` (which strips NOTHING) but whose HEAD is measured by `pnpm pack`
    // (which deletes six publish-only lifecycle scripts). Nothing about the package has
    // changed, so the truth is CLEAN — but an engine without the spec-v3 script rule sees
    // a manifest difference and reports DRIFT on a perfectly clean package. That was live
    // in this estate on @j0nathan-ll0yd/portal-contract, and this repo's own
    // packages/config publishes the same way. `prepublish` is present deliberately:
    // NEITHER tool strips it, so it must survive normalization on both sides.
    fs.mkdirSync(path.join(root, 'packages', 'npmpub', 'src'), {recursive: true})
    writeJson(path.join(root, 'packages', 'npmpub', 'package.json'), {
      name: '@toy/npmpub',
      version: '1.0.0',
      files: ['dist'],
      publishConfig: {registry: registryUrl},
      scripts: {build: 'node ../../build.js', prepack: 'node -e ""', prepublishOnly: 'node -e ""', prepublish: 'node -e ""'}
    })
    fs.writeFileSync(path.join(root, 'packages', 'npmpub', 'src', 'index.js'), 'module.exports = 3\n')
    commitAll(root, 'add npm-published package')
    if (!runWorkspaceBuild(root).ok) {
      throw new Error('fixture build failed before S14')
    }
    registry.publish('@toy/npmpub', '1.0.0', npmPackFixture(root, 'npmpub'))
    result = await gate({build: false})
    expect('S14 npm-published reference vs pnpm-packed head is CLEAN', result, '@toy/npmpub', 'CLEAN', 0)

    // S15 — DISCOVERY MUST NOT DEPEND ON DECLARED MEMBERSHIP (findings D1/X1).
    //
    // Two independent ways a real, published package goes invisible, reproduced together:
    //
    //   (a) THE WORKSPACE FILE IS SETTINGS-ONLY and carries no `packages:` key at all.
    //       That is not hypothetical — it is mantle-LifegamesPortal, verbatim. There,
    //       `pnpm list -r --depth -1 --json` (this file's ONLY enumeration source until
    //       now, whose doc comment called it "the authoritative workspace enumeration")
    //       returns the PRIVATE ROOT ALONE, so its `packages/portal-contract` — a real,
    //       published @j0nathan-ll0yd package — was never inventoried and the gate printed
    //       "0 publishable package(s): nothing evaluated / exit 0".
    //   (b) THE PACKAGE LIVES OUTSIDE EVERY DECLARED GLOB (`contracts/portal`, not
    //       `packages/*`), so even a repo that does declare its members can still hide one.
    //
    // The union of declared globs and a full directory scan sees both, and the run is
    // pointed at a package the registry serves with DIFFERENT bytes, so "discovered" is
    // proven by a real DRIFT verdict rather than by the row merely existing. The
    // `globonly` mutation restores the narrowing and this is the only rung that kills it.
    fs.mkdirSync(path.join(root, 'contracts', 'portal', 'src'), {recursive: true})
    writeJson(path.join(root, 'contracts', 'portal', 'package.json'), {
      name: '@toy/portal',
      version: '1.0.0',
      files: ['src'],
      publishConfig: {registry: registryUrl}
    })
    fs.writeFileSync(path.join(root, 'contracts', 'portal', 'src', 'index.js'), 'module.exports = "published"\n')
    commitAll(root, 'add an undeclared package outside every workspace glob')
    registry.publish('@toy/portal', '1.0.0', await packFixtureAt(root, path.join('contracts', 'portal')))
    fs.writeFileSync(path.join(root, 'contracts', 'portal', 'src', 'index.js'), 'module.exports = "edited, never republished"\n')
    // The settings-only workspace file, byte-for-byte the shape LP ships.
    const savedWorkspaceFile = fs.readFileSync(path.join(root, 'pnpm-workspace.yaml'), 'utf8')
    fs.writeFileSync(path.join(root, 'pnpm-workspace.yaml'), 'nodeLinker: hoisted\nverifyDepsBeforeRun: false\n')
    commitAll(root, 'settings-only workspace file, no packages: key')

    result = await gate({build: false})
    expect('S15 a package no workspace config declares is still discovered and evaluated', result, '@toy/portal', 'DRIFT', 2)
    check('S15 the declared-glob source is UNIONED with the scan, not replaced by it', ['@toy/leaf', '@toy/dependent'].every((name) =>
      row(result, name) !== undefined
    ), `dropping the glob source would lose the declared members too — rows=${JSON.stringify(result.rows.map((r) => r.name))}`)

    fs.writeFileSync(path.join(root, 'pnpm-workspace.yaml'), savedWorkspaceFile)
    fs.rmSync(path.join(root, 'contracts'), {recursive: true, force: true})
    commitAll(root, 'restore the declared workspace file')

    // S6 — a bump whose source edit never reaches the payload. `docs/notes.md` is
    // outside files[] and is not one of npm's injected root files, so the packed
    // payload is byte-identical to the published 1.0.1: the bump would publish the
    // same artifact under a new number, and the fix is to revert it.
    fs.mkdirSync(path.join(root, 'packages', 'leaf', 'docs'), {recursive: true})
    fs.writeFileSync(path.join(root, 'packages', 'leaf', 'docs', 'notes.md'), 'not in files[]\n')
    setVersion(root, 'leaf', '1.0.2')
    commitAll(root, 'bump leaf with no payload change')
    result = await gate()
    expect('S6 bump with no payload change is BUMP_NOT_NEEDED', result, '@toy/leaf', 'BUMP_NOT_NEEDED', 0)
    fs.rmSync(path.join(root, 'packages', 'leaf', 'docs'), {recursive: true})
    setVersion(root, 'leaf', '1.0.1')
    commitAll(root, 'restore leaf')

    // S10 — declared version below semverMax(R).
    setVersion(root, 'leaf', '0.9.0')
    commitAll(root, 'regress leaf')
    result = await gate()
    expect('S10 version regression', result, '@toy/leaf', 'VERSION_REGRESSION', 2)
    setVersion(root, 'leaf', '1.0.1')
    commitAll(root, 'restore leaf version')

    // S4 — a name the registry does not serve.
    const leafManifestFile = path.join(root, 'packages', 'leaf', 'package.json')
    const savedLeaf = fs.readFileSync(leafManifestFile, 'utf8')
    const renamed = JSON.parse(savedLeaf)
    renamed.name = '@toy/never-published'
    writeJson(leafManifestFile, renamed)
    commitAll(root, 'rename leaf')
    result = await gate()
    expect('S4 never published (branch lane)', result, '@toy/never-published', 'NEVER_PUBLISHED', 0)
    result = await gate({lane: 'post-publish'})
    expect('S4b never published blocks post-publish', result, '@toy/never-published', 'NEVER_PUBLISHED', 2)
    fs.writeFileSync(leafManifestFile, savedLeaf)
    commitAll(root, 'restore leaf name')

    // S8a — untracked debris under a DECLARED build output is not a leak.
    fs.writeFileSync(path.join(root, 'packages', 'dependent', 'dist', 'extra.js'), '// generated\n')
    result = await gate({build: false})
    check('S8a debris under a declared output is not a leak', row(result, '@toy/dependent').verdict !== 'LEAKED_ARTIFACT',
      'a declared turbo output was misreported as a leak')
    fs.rmSync(path.join(root, 'packages', 'dependent', 'dist', 'extra.js'))

    // S8 — gitignored debris inside a files[] allowlist that is NOT a build output.
    const depManifestFile = path.join(root, 'packages', 'dependent', 'package.json')
    const depManifest = JSON.parse(fs.readFileSync(depManifestFile, 'utf8'))
    depManifest.files = ['dist', 'src']
    writeJson(depManifestFile, depManifest)
    fs.appendFileSync(path.join(root, '.gitignore'), '.omc/\n')
    commitAll(root, 'dependent ships src too')
    setVersion(root, 'dependent', '1.0.2')
    commitAll(root, 'bump dependent to 1.0.2')
    registry.publish('@toy/dependent', '1.0.2', await packFixture(root, 'dependent'))
    fs.mkdirSync(path.join(root, 'packages', 'dependent', 'src', '.omc', 'state'), {recursive: true})
    fs.writeFileSync(path.join(root, 'packages', 'dependent', 'src', '.omc', 'state', 'scratch.json'), '{}\n')
    result = await gate({build: false})
    expect('S8 gitignored debris inside files[] is LEAKED_ARTIFACT', result, '@toy/dependent', 'LEAKED_ARTIFACT', 2)
    check('S8 the leak reports as itself, not as DRIFT', (row(result, '@toy/dependent').leakedPaths ?? []).includes('src/.omc/state/scratch.json'),
      `leakedPaths=${JSON.stringify(row(result, '@toy/dependent').leakedPaths)}`)
    fs.rmSync(path.join(root, 'packages', 'dependent', 'src', '.omc'), {recursive: true, force: true})

    // S11 — a reference tarball whose bytes do not match dist.integrity.
    registry.publish('@toy/dependent', '1.0.2', await packFixture(root, 'dependent'), {corrupt: true})
    result = await gate({build: false})
    expect('S11 integrity mismatch is INDETERMINATE', result, '@toy/dependent', 'INDETERMINATE', 3)
    registry.publish('@toy/dependent', '1.0.2', await packFixture(root, 'dependent'))

    // S9 — a build script that fails.
    fs.writeFileSync(path.join(root, 'build.js'), 'process.exit(7)\n')
    result = await gate()
    expect('S9 broken build is BUILD_FAILED', result, '@toy/leaf', 'BUILD_FAILED', 4)

    // S9b — a build that exits 0 but leaves a declared output empty.
    fs.writeFileSync(path.join(root, 'build.js'), 'require("fs").mkdirSync("dist", {recursive: true})\n')
    fs.rmSync(path.join(root, 'packages', 'leaf', 'dist'), {recursive: true, force: true})
    fs.rmSync(path.join(root, 'packages', 'dependent', 'dist'), {recursive: true, force: true})
    result = await gate()
    expect('S9b empty declared output is BUILD_FAILED', result, '@toy/leaf', 'BUILD_FAILED', 4)
    fs.writeFileSync(path.join(root, 'build.js'), BUILD_JS)

    // S5 — THE SCENARIO THAT PROVED THE TRANSPORT CHOICE. Rehearsing it against an
    // `npm view`/`npm pack` reference caught a real defect: with the registry process
    // killed the gate reported CLEAN / exit 0, because npm served the packument from
    // ~/.npm/_cacache. --prefer-online did NOT fix it.
    await registry.close()
    result = await gate()
    expect('S5 unreachable registry is INDETERMINATE', result, '@toy/leaf', 'INDETERMINATE', 3)
    check('S5 an unreachable registry is EXPLICITLY NOT A PASS', result.exitCode !== 0,
      'a dead registry produced exit 0 — this is the A2b silent total pass')
  } catch (err) {
    if (err !== STOP) {
      failures.push(`self-test threw — ${err.stack ?? err.message}`)
    }
  } finally {
    await registry.close().catch(() => {})
    fs.rmSync(root, {recursive: true, force: true})
    if (mutantDir) {
      fs.rmSync(mutantDir, {recursive: true, force: true})
    }
  }

  return failures
}

/**
 * MUTATIONS ARE PATCHES OF THE SOURCE TEXT, NOT BRANCHES IN IT (finding X11).
 *
 * The previous generation threaded a `mutant` parameter through runGate() and packOne()
 * and wrote `if (mutant === 'nocanon')` inline. That has two defects that matter: the
 * SHIPPED binary carried test-only branches, and each mutant exercised a DIFFERENT
 * expression from the one production evaluates — so a mutant could be "killed" while the
 * production expression beside it stayed broken.
 *
 * Here each entry names a literal fragment of THIS file. `writeMutatedScript` asserts the
 * anchor matches EXACTLY ONCE (an anchor that drifted out of the source, or that became
 * ambiguous, is a hard error rather than a silently skipped mutation), applies the patch
 * to a temp copy, and the suite runs against that copy. Production code carries nothing.
 *
 * `scenario` is the id prefix the mutation MUST break; if it survives, --self-test fails.
 */
// ---8<--- MUTATION TABLE BEGIN (this region is excluded from the anchor search, because
// it quotes every anchor verbatim and would otherwise make all of them ambiguous) ---8<---
const MUTATIONS = {
  // The direct analogue of the `<head> <head>` mutation that the previous generation
  // could not see: short-circuit the reference to the local payload.
  selfref: {
    scenario: 'S2',
    anchor: 'const refCompare = reference ? (strictMaps ? reference.strictPerFile : reference.effectivePerFile) : null',
    replacement: 'const refCompare = reference ? headEffectivePerFile : null'
  },
  // Compare raw tarball bytes instead of the canonical digest. MEASURED: three
  // consecutive packs of one unedited tree give three different tarball hashes.
  rawbytes: {
    scenario: 'S1 clean baseline (leaf)',
    anchor: 'const refDigest = refCompare ? digestOf(refCompare) : null\n      const headDigest = effectiveDigest',
    replacement: 'const refDigest = reference ? `raw:${reference.version}` : null\n      const headDigest = `raw:${sha256(bytes)}`'
  },
  // Use `npm pack`, which never rewrites workspace:* to a concrete version.
  npmpack: {scenario: 'S1 clean baseline (dependent)', anchor: "const cmd = 'pnpm'", replacement: "const cmd = 'npm'"},
  // Map a registry fetch() failure to "nothing published, so fine" — the A2b silent pass.
  swallow: {
    scenario: 'S0',
    anchor: 'packuments.set(member.name, await fetchPackument(registry, member.name, authToken))',
    replacement: 'const probe = await fetchPackument(registry, member.name, authToken)\n' +
      "    packuments.set(member.name, probe.kind === 'ok' ? probe : {kind: 'ok', versions: {}})"
  },
  // Skip the recursive key sort in canonicalize().
  nocanon: {scenario: 'S1b', anchor: 'const canonical = canonicalize(parsed)', replacement: 'const canonical = parsed'},
  // Skip the leak screen.
  noleak: {
    scenario: 'S8 gitignored',
    anchor: 'leaked = leakScreen([...headFiles.keys()], {tracked: gitTrackedFiles(repoRoot, member.path), outputs})',
    replacement: 'leaked = []'
  },
  // Retain `version` in the canonical manifest.
  versionkept: {scenario: 'S6', anchor: 'delete canonical.version', replacement: 'void canonical.version'},
  // Drop the six publish-only lifecycle scripts rule — the pre-spec-v3 behaviour that
  // reported DRIFT on an npm-published package whose HEAD is exactly what is published.
  keepscripts: {
    scenario: 'S14',
    anchor: 'for (const name of PUBLISH_ONLY_SCRIPTS) {\n      delete canonical.scripts[name]\n    }',
    replacement: 'void PUBLISH_ONLY_SCRIPTS'
  },
  // Restore the pnpm-list-only inventory of finding D1: discovery narrowed back to
  // DECLARED workspace members, so a package no workspace config names is invisible. This
  // is the mutant that reproduces the real mantle-LifegamesPortal silent exit 0.
  globonly: {
    scenario: 'S15',
    anchor: 'const selected = selectPackageDirectories(manifestDirs.filter((dir) => !ignored.has(dir)), globs)',
    replacement: 'const selected = manifestDirs.filter((dir) => !ignored.has(dir))\n' +
      "    .filter((dir) => dir === '.' || globs.some((glob) => workspaceGlobToRegExp(glob).test(dir)))"
  },
  // Remove the empty-set guard, so "I inventoried nothing" renders as "all clean" again
  // (finding D2/X1b) — the second half of the same silent total pass.
  emptyset: {scenario: 'S19', anchor: "      verdict: 'NO_PUBLISHABLE_PACKAGES',", replacement: "      verdict: 'SKIPPED',"},
  // Delete the discovery-error exit floor, so a manifest that could not be READ AT ALL
  // stops raising the exit status and the packages that WERE readable report a pass on
  // their own (finding A4). Killed by S20. Until that rung existed this exact edit left the
  // suite reporting "baseline green, all 13 mutations killed" and exiting 0 — the guarantee
  // D1 claims in discoverWorkspace's doc comment was, measurably, unpinned.
  discoveryfloor: {scenario: 'S20', anchor: 'discoveryErrors.length > 0 ? EXIT_INDETERMINATE : EXIT_OK', replacement: 'EXIT_OK'},
  // Stop subtracting the paths git ignores, so vendored copies, scaffolding scratch and
  // extracted tarballs are inventoried as if they were publishable packages of this repo
  // (finding A4, LOW half). Killed by S21. Patches the SAME line as `globonly` with the
  // opposite defect — that one narrows the inventory, this one widens it — and each is
  // applied to its own pristine copy, so the two never interfere.
  ignorekept: {
    scenario: 'S21',
    anchor: 'const selected = selectPackageDirectories(manifestDirs.filter((dir) => !ignored.has(dir)), globs)',
    replacement: 'const selected = selectPackageDirectories(manifestDirs, globs)'
  },
  // ── The verdict -> exit mapping, pinned in BOTH directions (finding D3) ──────────
  //
  // All three mutants below edit the SAME one line at the bottom of this file. Before D3
  // the only spawned rung was S13, which expects 2 — so any edit that PRESERVED 2 was
  // invisible, and "the exit boundary is covered" was true of exactly one of four exit
  // classes. Each mutant is killed by a different rung, and by only that rung.
  //
  // Direction 1: a blocking verdict laundered into a pass. Killed by S13 (drift -> 2).
  exitcode: {scenario: 'S13', anchor: 'process.exitCode = code', replacement: 'process.exitCode = 0'},
  // Direction 2: every verdict blocks. S13 still sees 2 and stays green, so this survived
  // the whole suite while the gate blocked every clean push in the estate. Killed by S17.
  exitalways2: {scenario: 'S17', anchor: 'process.exitCode = code', replacement: 'process.exitCode = EXIT_BLOCK'},
  // Direction 3: THE DANGEROUS ONE. DRIFT still blocks — so the gate looks alive, S13 is
  // green, and every "could not tell" (dead registry, missing token, unreadable manifest,
  // nothing discovered) silently becomes a pass. This is A2b defeated at the process
  // boundary rather than in the verdict logic. Killed by S18, and again by S19.
  exitlaunder3: {scenario: 'S18', anchor: 'process.exitCode = code', replacement: 'process.exitCode = code === EXIT_INDETERMINATE ? EXIT_OK : code'}
}
// ---8<--- MUTATION TABLE END ---8<---

/**
 * Writes a one-patch copy of this file into `dir` and returns its path.
 *
 * The anchor must match EXACTLY ONCE outside the table region — otherwise the mutation is
 * not testing what it claims to test, and that is a hard error rather than a silently
 * skipped mutation. The table itself is excluded from the search because it necessarily
 * quotes every anchor verbatim; this function is defined after the END marker, so its own
 * references to the marker strings are outside the excluded slice and harmless.
 */
function writeMutatedScript(id, dir) {
  const {anchor, replacement} = MUTATIONS[id]
  const source = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8')
  const start = source.indexOf('MUTATION TABLE BEGIN')
  const end = source.indexOf('MUTATION TABLE END')
  if (start < 0 || end <= start) {
    throw new Error('the mutation table markers are missing or out of order — anchors cannot be searched safely')
  }
  const before = source.slice(0, start)
  const table = source.slice(start, end)
  const after = source.slice(end)
  const hits = before.split(anchor).length - 1 + (after.split(anchor).length - 1)
  if (hits !== 1) {
    throw new Error(`mutation ${id}: anchor matched ${hits} time(s) outside the table, expected exactly 1 — the anchor has drifted out of the source`)
  }
  const patched = before.includes(anchor)
    ? before.replace(anchor, replacement) + table + after
    : before + table + after.replace(anchor, replacement)
  fs.mkdirSync(dir, {recursive: true})
  const file = path.join(dir, 'check-package-drift.mjs')
  fs.writeFileSync(file, patched)
  return file
}

async function selfTestCommand({mutation}) {
  if (mutation) {
    if (!(mutation in MUTATIONS)) {
      console.error(`unknown mutation ${mutation}; known: ${Object.keys(MUTATIONS).join(', ')}`)
      return 1
    }
    const {scenario} = MUTATIONS[mutation]
    console.log(`\nself-test with mutation=${mutation} (expected to FAIL at "${scenario}")\n`)
    const failures = await runSelfTest({mutation, stopAfter: scenario})
    const relevant = failures.filter((f) => matchesScenario(f, scenario))
    if (relevant.length === 0) {
      console.error(`\nMUTATION ${mutation} SURVIVED — the suite cannot detect it. That is a build failure.\n`)
      return 1
    }
    console.log(`\nmutation ${mutation} killed by ${relevant.length} assertion(s) at ${scenario}*.\n`)
    return 0
  }

  console.log('\nself-test: end-to-end, throwaway git repo + offline registry, no stubbed seams\n')
  const started = Date.now()
  const baseline = await runSelfTest({})
  if (baseline.length > 0) {
    console.error(`\nself-test FAILED (${baseline.length} assertion(s)):`)
    for (const failure of baseline) {
      console.error(`  - ${failure}`)
    }
    return 1
  }
  const ids = Object.keys(MUTATIONS)
  console.log(`\nbaseline green. Now proving the suite CAN fail (A2b) — ${ids.length} source mutations:\n`)

  let survivors = 0
  for (const id of ids) {
    const {scenario} = MUTATIONS[id]
    const failures = await runSelfTest({mutation: id, verbose: false, stopAfter: scenario})
    const killed = failures.find((f) => matchesScenario(f, scenario)) ?? null
    if (killed) {
      console.log(`  killed    ${id.padEnd(14)} by ${killed.split(' — ')[0]}`)
    } else {
      console.error(`  SURVIVED  ${id.padEnd(14)} — expected "${scenario}" to fail`)
      survivors += 1
    }
  }
  if (survivors > 0) {
    console.error(`\nself-test FAILED: ${survivors} mutation(s) survived.\n`)
    return 1
  }
  console.log(`\nself-test passed: baseline green, all ${ids.length} mutations killed (${((Date.now() - started) / 1000).toFixed(1)}s).\n`)
  return 0
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI
// ─────────────────────────────────────────────────────────────────────────────

export function parseArgs(argv) {
  const opts = {
    lane: 'branch',
    json: false,
    strictMaps: false,
    useCache: true,
    build: true,
    selfTest: false,
    mutation: null,
    repoRoot: null,
    registry: null,
    scope: null,
    help: false
  }
  for (const arg of argv) {
    if (arg === '--') {
      // POSIX end-of-options marker. pnpm 11 forwards a bare `--` from
      // `pnpm run <script> -- --flag` straight through to the script, so
      // rejecting it turns a standard invocation into a hard error.
      continue
    } else if (arg === '--json') {
      opts.json = true
    } else if (arg === '--strict-maps') {
      opts.strictMaps = true
    } else if (arg === '--no-cache') {
      opts.useCache = false
    } else if (arg === '--no-build') {
      opts.build = false
    } else if (arg === '--self-test') {
      opts.selfTest = true
    } else if (arg.startsWith('--mutation=')) {
      opts.mutation = arg.slice('--mutation='.length)
    } else if (arg.startsWith('--repo-root=')) {
      // Point the gate at another checkout. Exists so the end-to-end exit-code test can
      // spawn THIS file as a real process against a throwaway fixture repo (finding X2).
      opts.repoRoot = arg.slice('--repo-root='.length)
    } else if (arg.startsWith('--registry=')) {
      // Same reason. A wrong value can only ever produce INDETERMINATE / exit 3 (A2b),
      // never a pass, so this cannot be used to launder a green run.
      opts.registry = arg.slice('--registry='.length)
    } else if (arg.startsWith('--scope=')) {
      // Same reason. Discovery reads publishConfig from the manifest now, but `--registry`
      // overrides it (see classifyMember), so scope stays the classifier that decides which
      // names a spawned run over a fixture workspace treats as this estate's own.
      opts.scope = arg.slice('--scope='.length)
    } else if (arg.startsWith('--lane=')) {
      opts.lane = arg.slice('--lane='.length)
    } else if (arg === '--help' || arg === '-h') {
      opts.help = true
    } else {
      throw new Error(`unknown argument ${arg}`)
    }
  }
  if (!LANES.includes(opts.lane)) {
    throw new Error(`--lane must be one of ${LANES.join('|')}`)
  }
  return opts
}

async function main(argv) {
  let opts
  try {
    opts = parseArgs(argv)
  } catch (err) {
    console.error(err.message)
    return 1
  }
  if (opts.help) {
    console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0])
    return 0
  }
  if (opts.selfTest) {
    return selfTestCommand(opts)
  }

  const repoRoot = opts.repoRoot ? path.resolve(opts.repoRoot) : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const result = await runGate({
    repoRoot,
    ...(opts.registry ? {registry: opts.registry} : {}),
    ...(opts.scope ? {scope: opts.scope} : {}),
    lane: opts.lane,
    strictMaps: opts.strictMaps,
    useCache: opts.useCache,
    build: opts.build,
    // Under --json, STDOUT CARRIES THE DOCUMENT AND NOTHING ELSE. Progress lines are
    // suppressed and the workspace build's stdout is redirected to stderr (finding X8).
    quiet: opts.json,
    log: opts.json ? () => {} : (line) => console.log(`[drift] ${line}`)
  })
  if (opts.json) {
    console.log(
      JSON.stringify({
        specVersion: SPEC_VERSION,
        lane: result.lane,
        exitCode: result.exitCode,
        discoveryErrors: result.discoveryErrors ?? [],
        discoverySources: result.discoverySources ?? [],
        rows: result.rows
      }, null, 2)
    )
  } else {
    report(result)
  }
  return result.exitCode
}

/**
 * SILENT-PASS-BY-NON-EXECUTION (finding D6). BOTH SIDES MUST BE REALPATH-RESOLVED.
 *
 * Node resolves symlinks when it loads an ES module, so `import.meta.url` is always the
 * REAL path; `process.argv[1]` is whatever the caller typed and is NOT resolved. Comparing
 * a raw argv[1] against a realpath therefore returns false for every symlinked
 * invocation — and this file then loads, defines everything, runs nothing, prints nothing
 * and exits 0. MEASURED before this fix: `node /tmp/drift-link.mjs --lane=branch
 * --repo-root=<repo>` produced zero bytes of output and status 0.
 *
 * That is the worst failure mode a gate has: it is indistinguishable from a pass, and
 * symlinked entry points are ordinary (a `node_modules/.bin` shim, a Homebrew-style
 * wrapper, a vendored copy linked into a consumer repo). `fs.realpathSync` is applied to
 * both sides, and a path that cannot be realpath'd (deleted mid-run) falls back to
 * `path.resolve` rather than throwing at module scope.
 */
const realpath = (target) => {
  try {
    return fs.realpathSync(target)
  } catch {
    return path.resolve(target)
  }
}
const invokedDirectly = Boolean(process.argv[1]) && realpath(process.argv[1]) === realpath(fileURLToPath(import.meta.url))
if (invokedDirectly) {
  main(process.argv.slice(2)).then((code) => {
    process.exitCode = code
  })
}

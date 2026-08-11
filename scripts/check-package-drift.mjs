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
 * THE SECOND QUESTION: DID THE PUBLIC SURFACE SHRINK?
 * The payload comparison above cannot see a removed entry point — a shrunk `exports`
 * map is a legitimate payload difference under a legitimate version bump, which is
 * PENDING_PUBLISH / exit 0. @j0nathan-ll0yd/web@1.1.0, a package of this repo, removed
 * the `./types/*` subpath and shipped as a MINOR with every gate green. The
 * export-surface rule (spec v2, see the SURFACE_SPEC_VERSION block) compares the
 * `exports` subpath KEYS of the packed payload against the same published reference the
 * digest uses, sizes the declared bump with CARET-RANGE semantics, and reports
 * SURFACE_BREAK — exit 2 in EVERY lane — when the declared bump is too small. It is
 * defined by atlas/contracts/export-surface/reference.mjs and pinned by the 61 vendored
 * vectors in scripts/fixtures/, not by this file.
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
import {createRequire} from 'node:module'
import os from 'node:os'
import path from 'node:path'
import {fileURLToPath, pathToFileURL} from 'node:url'
import zlib from 'node:zlib'

/**
 * THE NAMED-EXPORT EXTRACTOR IS VENDORED, NOT REIMPLEMENTED — and it is the one piece of the
 * export-surface contract this file does NOT hand-write.
 *
 * Everywhere else in this engine the rule is reimplemented locally and held to the shared vectors,
 * because three engines reproducing one rule is what the conformance fixtures exist to police. The
 * extractor is the deliberate exception (atlas decision 0028, axis C): it is an order of magnitude
 * more code than a subpath-key comparison AND it is the only part that depends on `typescript`, so
 * three hand-written copies would repeat findings X3/X7 with far better odds. `scripts/fixtures/
 * extract.mjs` is therefore byte-identical to `atlas/contracts/export-surface/extract.mjs`, and
 * `scripts/fixtures/reference.mjs` is the three-line adapter that points its one relative import
 * back at this file (see that file's header for why the cycle is safe).
 */
import {acceptsCachedSurface, EXPECTED_TS_VERSION, EXTRACT_SPEC_VERSION, extractSurfaceNames} from './fixtures/extract.mjs'

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

/**
 * sha256 of scripts/fixtures/export-surface-conformance.json, vendored verbatim from
 * atlas/contracts/export-surface/. Same discipline, same reason, DIFFERENT NUMBER: the
 * export-surface rule and the payload digest change for different reasons, so they carry
 * independent spec versions and independent checksums. Re-vendor and update this constant
 * in the SAME change.
 */
export const EXPORT_SURFACE_CONFORMANCE_SHA256 = 'ebeb8607c56384b0b489a1630797ac63210806b0f0005fc88579e3820c303eba'

/**
 * sha256 of scripts/fixtures/export-extract-conformance.json, vendored verbatim from
 * atlas/contracts/export-surface/. TWO FIXTURES, TWO CHECKSUMS, TWO NUMBERS (atlas
 * decision 0028 §D1). This one pins the EXTRACTOR — the volatile half that turns a packed
 * file tree into a name set, and the only half that depends on `typescript`. It is
 * separate from EXPORT_SURFACE_CONFORMANCE_SHA256 so a `typescript` patch bump or an
 * extractor tweak regenerates only this fixture and leaves the RULE fixture's checksum
 * untouched; a single monolithic fixture would force a full re-vendor of a rule that did
 * not change. Re-vendor and update this constant in the SAME change.
 */
export const EXPORT_EXTRACT_CONFORMANCE_SHA256 = '5ad8995d752ccdbc92994869f2f7b074ef32d73c84de279fe5db3342dc5cdff5'

/**
 * The verdict-ladder contract version this engine implements — the DECISION (`decideVerdict`) and
 * the lane→exitClass mapping (`exitClassFor`), NOT the digest and NOT the export surface. Same
 * number <=> identical verdicts and exit classes for every input, across mantle's CLI, this script,
 * and atlas's pkg-drift engine. Deliberately INDEPENDENT of SPEC_VERSION and SURFACE_SPEC_VERSION:
 * the three schemes change for different reasons. Bump it (and re-vendor verdict-conformance.json)
 * only when the verdict SET or an exit mapping changes — never for the probe, discovery, reporting
 * or CLI flags. See atlas decision 0022.
 */
export const LADDER_SPEC_VERSION = 1

/**
 * sha256 of scripts/fixtures/verdict-conformance.json, vendored verbatim from
 * atlas/contracts/verdict-ladder/. Same discipline as DRIFT_CONFORMANCE_SHA256 and
 * EXPORT_SURFACE_CONFORMANCE_SHA256, DIFFERENT NUMBER: the ladder, the payload digest and the
 * export-surface rule change for different reasons, so they carry independent spec versions and
 * independent checksums. Re-vendor and update this constant in the SAME change.
 */
export const LADDER_CONFORMANCE_SHA256 = '2dd86a7865b58e02d9b7a6d9a015efd97c5194c6d2a09aab600f564d6bbf507e'

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
    // Two unparseable versions are EQUAL, deterministically, and an unparseable version sorts BEFORE
    // any parseable one: the ladder never manufactures an ordering between strings it cannot parse,
    // and an unknown version can never read as "ahead of the registry" (a would-be PENDING_PUBLISH
    // becomes VERSION_REGRESSION). Held to atlas/contracts/verdict-ladder by the semver-*-not-semver
    // conformance vectors; the previous `localeCompare` disagreed on both counts.
    return !pa && !pb ? 0 : (!pa ? -1 : 1)
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
// Export-surface compatibility (spec v2)
//
// THE GAP THIS CLOSES — MEASURED 2026-08-04, NOT HYPOTHESISED. Everything above
// answers ONE question: "does the payload we would publish differ from the payload
// already published?" It never asks "did the PUBLIC SURFACE shrink?", so a removed
// export ships green under ANY version bump.
//
// `@j0nathan-ll0yd/web@1.1.0` — a package of THIS repo — removed the `./types/*`
// subpath from its `exports` map and shipped as a MINOR. Every gate in the estate
// passed, and correctly so by its own rules: the payload legitimately differed and
// the version was legitimately ahead of the registry, which is PENDING_PUBLISH —
// exit 0 on a branch. Nothing anywhere was red. A consumer on `^1.0.0` picked up
// 1.1.0 on its next install and lost an entry point.
//
// PROVENANCE, since the motivating artifact is gone: 1.1.0 was DELETED from the
// registry on 2026-08-04 and republished as `2.0.0` — content-identical, carrying the
// major the removal always warranted. `npm pack @j0nathan-ll0yd/web@1.1.0` now 404s.
// The same delta is still reproducible from real artifacts: `1.0.0`'s `exports` map
// contains `"./types/*"` and `2.0.0`'s does not. Nothing here depends on that, and
// deliberately so — the conformance vectors are self-contained literals, because a
// test that reads a mutable registry to establish a fixed historical fact is a test
// that breaks when someone tidies the registry.
//
// SCOPE IS LEVEL 1 (subpath KEYS) AND THAT IS A MEASURED DECISION, not laziness.
// Level 2 — enumerating the named exports behind each entry point — was probed
// against all 24 published packages in the estate before being adopted at spec v3
// (atlas decision 0028). The probe found extraction deterministic and hermetic, but
// found two classes that had to be CLASSIFIED before it could gate anything: 121 of
// the estate's 253 concrete subpaths are .css/.json/.md assets with no export surface
// at all, and 28 are .astro components whose implicit `default` a TypeScript parse
// reports as zero exports — a SILENTLY WRONG answer. So the classifier is three-way
// and total (NO_SURFACE / SFC_ENTRY / INDETERMINATE), which drops corpus INDETERMINATE
// from 30/253 to 2/253 — and those 2 are genuinely broken targets that SHOULD be red.
//
// LEVEL 2 IS ADVISORY IN THIS REPO TODAY (0028 PR 3). The rule is computed and reported;
// it moves no exit code. The enforce-flip is 0028 PR 4, after all three engines are on
// spec v3. See `level1View`, and the `level2*` mutants in the MUTATION TABLE.
//
// THE RULE IS NOT DEFINED HERE. It is defined in atlas/contracts/export-surface/
// reference.mjs and pinned by the 99 rule vectors + 39 extractor vectors vendored into
// scripts/fixtures/. This is one of three implementations that must reproduce those
// vectors exactly; the estate has already paid once for three hand-written copies of a
// shared rule diverging silently (findings X3 and X7). The one exception is the
// EXTRACTOR, which is vendored rather than reimplemented — see the import header.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * SAME NUMBER <=> IDENTICAL VERDICTS, for every input.
 *
 * Bump if and only if the surface or bump classification changes for ANY input: the
 * surface kinds, the cross-kind reconciliation, the delta rule, or the bump sizing. Do NOT
 * bump for reporting, plumbing or caching. A bump is atomic across the estate: regenerate
 * the fixture in atlas, re-vendor it here and into mantle, and move all three numbers in
 * the same change. The vendored runner asserts `specVersion === fixture.specVersion` as
 * case zero, so a rule change without a bump cannot pass conformance anywhere.
 *
 * Deliberately INDEPENDENT of SPEC_VERSION above: the two schemes change for different
 * reasons, and coupling them would force reference-cache invalidation for unrelated edits.
 *
 * WHY 2 (atlas decision 0024). `evaluateSurface` became changeset-aware: it now sizes the
 * surface delta against the PROJECTED post-`changeset version` version when a changeset is
 * measured, so an adequate pending bump satisfies the rule (the DS #164 class of PR, forced to
 * manual-bump under v1). The verdict moves for at least one input — a removed subpath under a
 * declared MINOR with a pending MAJOR is now `ok` where v1 said `break` — so the number moves.
 * The change is fail-safe by construction: no measured changeset, an inadequate projection, or a
 * projection that is not a genuine forward move all fall back to the v1 declared-version
 * behaviour, and the mandatory-adequacy comparison is the SAME rank test as before.
 *
 * WHY 3 (atlas decision 0028). The rule became LEVEL-2 AWARE: `surfaceDelta` now folds the
 * per-subpath NAMED-EXPORT delta into the SAME `required` (max rank with the Level-1 subpath
 * delta), and the surface object gained a `names` field. The verdict moves for at least one
 * input — a package that keeps every subpath but deletes a named export from one of them is now
 * `break` where v2 said `ok` — so the number moves. `evaluateSurface`'s signature and its 0024
 * projection ARITHMETIC are UNCHANGED, byte for byte: Level 2 only makes `delta.required`
 * richer, so every spec-version-2 vector keeps passing.
 *
 * IN THIS REPO LEVEL 2 IS CURRENTLY ADVISORY (0028 PR 3). The rule below is fully v3 and the
 * engine runs it — but the VERDICT path is handed `level1View`-stripped surfaces, so no exit
 * code can move because of a named delta. See `level1View` and the Step 7b wiring.
 */
export const SURFACE_SPEC_VERSION = 3

/**
 * `EXTRACT_SPEC_VERSION` AND `EXPECTED_TS_VERSION` ARE RE-EXPORTED FROM THE VENDORED EXTRACTOR,
 * NOT REDECLARED HERE.
 *
 * Every other contract number in this file is a local constant precisely so a divergence between
 * this engine and the fixture turns the suite red. These are the inverse: the extractor itself is
 * vendored byte-verbatim (see the import header), so the numbers that govern it live in the same
 * bytes they describe. Redeclaring them would create a second place for them to be wrong, and the
 * runner's case-zero would then compare this file's opinion against the fixture rather than the
 * extractor's.
 *
 * Deliberately INDEPENDENT of SURFACE_SPEC_VERSION: a `typescript` patch bump changes no rule.
 */
export { EXPECTED_TS_VERSION, EXTRACT_SPEC_VERSION }

/**
 * The four ways a subpath's type surface can be classified (Level 2, atlas decision 0028 §2.2).
 *
 * DECLARED HERE, IN THE RULE — not imported from the extractor, and the direction matters twice
 * over. Conceptually, the rule is what COMPARES two classifications and the extractor is what
 * PRODUCES them, so the vocabulary belongs to the comparer (this mirrors atlas exactly, where it
 * lives in `reference.mjs`, and `extract.mjs` imports it). Mechanically, the vendored extractor
 * re-exports this symbol back out, so importing it FROM there would close an indirect-export loop
 * through `fixtures/reference.mjs` that Node rejects outright — "Detected cycle while resolving
 * name 'CLASSIFICATIONS'", measured. One declaration, one direction, no cycle.
 *
 *   TYPED         a resolvable code target      -> its enumerated `{name, kind}` set
 *   SFC_ENTRY     an `.astro` component         -> the synthetic `{default}`
 *   NO_SURFACE    an asset, or a blocked target -> DETERMINABLY nothing; compared only vs NO_SURFACE
 *   INDETERMINATE could not be read             -> `required: null`, which the caller escalates
 *
 * The three-way NO_SURFACE / INDETERMINATE / real-surface distinction IS A2b in both directions,
 * and collapsing any pair of them is the failure this whole rule exists to prevent. The values are
 * part of the contract: they are compared against the vendored extractor's output and appear
 * verbatim in the vendored `export-extract-conformance.json` vectors.
 */
export const CLASSIFICATIONS = Object.freeze({TYPED: 'TYPED', SFC_ENTRY: 'SFC_ENTRY', NO_SURFACE: 'NO_SURFACE', INDETERMINATE: 'INDETERMINATE'})

/** Classifications that carry an enumerated name set (as opposed to determinably none, or unknown). */
const NAME_BEARING = new Set([CLASSIFICATIONS.TYPED, CLASSIFICATIONS.SFC_ENTRY])

/** Ordered weakest to strongest. `BUMP_ORDER.indexOf` is the comparison. */
export const BUMP_ORDER = Object.freeze(['none', 'patch', 'minor', 'major'])

const bumpRank = (level) => BUMP_ORDER.indexOf(level)

/**
 * The verdicts this rule is applied over: a successfully-compared pair, where a reference
 * surface genuinely exists and describes the SAME artifact the payload digest compared
 * against. NEVER_PUBLISHED has no reference surface to shrink from, and VERSION_REGRESSION
 * is a more fundamental defect in the same exit class — neither is second-guessed here.
 */
// PENDING_CHANGESET MUST be here: it is a genuine DRIFT the changeset excuse softened, and a
// shrinking export surface on an excused package must still become SURFACE_BREAK. Omitting it would
// let a surface break on an excused package escape the surface rule entirely and ship green. The
// surface rule runs AFTER decideVerdict and overrides it, exactly as it does for a plain DRIFT.
export const SURFACE_APPLICABLE_VERDICTS = new Set(['CLEAN', 'DRIFT', 'PENDING_CHANGESET', 'PENDING_PUBLISH', 'BUMP_NOT_NEEDED'])

/**
 * How a package declares what consumers may import: `exports-map`, `legacy` or `unreadable`.
 *
 * `legacy` is a REAL, determinable state, not a failure — a package with no `exports` field
 * lets Node resolve any file inside it. Both sides `legacy` means "surface unchanged", not
 * "surface unknown", so `main`-only packages stay quiet instead of blocking.
 *
 * Every branch is total: no throw, no silent default. An input this cannot classify becomes
 * `unreadable` WITH A REASON, and the caller must escalate that to INDETERMINATE (exit 3).
 * "I could not read the surface" is never a pass — that is the estate's A2b rule, and it is
 * the same rule that already governs an unreachable registry twenty lines further down.
 *
 * @param {string|null|undefined} manifestText the packed payload's top-level package.json
 * @returns {{kind: 'exports-map'|'legacy'|'unreadable', subpaths: string[], detail: string|null}}
 */
export function readExportSurface(manifestText) {
  if (typeof manifestText !== 'string') {
    return {kind: 'unreadable', subpaths: [], detail: `the payload contains no ${MANIFEST_ENTRY}`}
  }
  let parsed
  try {
    parsed = JSON.parse(manifestText)
  } catch (error) {
    return {kind: 'unreadable', subpaths: [], detail: `${MANIFEST_ENTRY} is not parseable JSON: ${error?.message ?? String(error)}`}
  }
  if (!isPlainObject(parsed)) {
    return {kind: 'unreadable', subpaths: [], detail: `${MANIFEST_ENTRY} is not a JSON object`}
  }
  if (!('exports' in parsed) || parsed.exports === undefined) {
    return {kind: 'legacy', subpaths: [], detail: null}
  }
  const exportsField = parsed.exports
  if (exportsField === null) {
    // `"exports": null` is valid and blocks every specifier, including '.'. An EMPTY surface.
    return {kind: 'exports-map', subpaths: [], detail: null}
  }
  if (typeof exportsField === 'string' || Array.isArray(exportsField)) {
    // Sugar for `{".": <target>}` — one subpath, and only one.
    return {kind: 'exports-map', subpaths: ['.'], detail: null}
  }
  if (!isPlainObject(exportsField)) {
    return {kind: 'unreadable', subpaths: [], detail: `"exports" is a ${typeof exportsField}, which Node does not accept`}
  }
  const keys = Object.keys(exportsField)
  if (keys.length === 0) {
    return {kind: 'exports-map', subpaths: [], detail: null}
  }
  const subpathKeys = keys.filter((key) => key.startsWith('.'))
  if (subpathKeys.length === keys.length) {
    // Sorted, so manifest key ORDER can never move a verdict — pnpm reorders keys when it
    // packs, which is the same reason canonicalize() exists for the digest.
    return {kind: 'exports-map', subpaths: [...subpathKeys].sort(), detail: null}
  }
  if (subpathKeys.length === 0) {
    // The conditions form (`{"import": ..., "require": ...}`) is sugar for '.' with conditions.
    return {kind: 'exports-map', subpaths: ['.'], detail: null}
  }
  // Node rejects a mixed object outright ("Invalid package config ... cannot contain some
  // keys starting with '.' and some not"). Guessing which half was meant would be inference,
  // so this is the one shape the reader refuses.
  return {
    kind: 'unreadable',
    subpaths: [],
    detail: `"exports" mixes ${subpathKeys.length} subpath key(s) with ${keys.length - subpathKeys.length} condition key(s), ` +
      'which Node rejects as an invalid package config'
  }
}

/**
 * The same manifest read, but yielding each subpath's RAW `exports` VALUE rather than just its
 * key (spec version 3).
 *
 * The extractor needs the targets to resolve; `readExportSurface` deliberately does not expose
 * them. Rather than let the extractor re-derive Node's sugar rules — a second, divergable copy of
 * the one thing this rule exists to keep singular — the sugar handling stays in ONE place and this
 * function reads through it. It returns EXACTLY the subpath keys `readExportSurface` returns for
 * the same input, and the vendored `tgt-*` vectors assert that agreement directly: a SUGAR
 * DISAGREEMENT between the two readers would mean the rule and the extractor disagree about what a
 * subpath even is.
 *
 * @param {string|null|undefined} manifestText
 * @returns {{kind: 'exports-map'|'legacy'|'unreadable', targets: Record<string, unknown>, detail: string|null}}
 */
export function readExportTargets(manifestText) {
  const surface = readExportSurface(manifestText)
  if (surface.kind !== 'exports-map') {
    return {kind: surface.kind, targets: {}, detail: surface.detail}
  }
  // `readExportSurface` already proved the manifest parses and the shape is one Node accepts, so
  // this re-parse cannot fail; it exists only to reach the values behind the keys it returned.
  const parsed = JSON.parse(manifestText)
  const exportsField = parsed.exports
  if (surface.subpaths.length === 1 && surface.subpaths[0] === '.' && !(isPlainObject(exportsField) && '.' in exportsField)) {
    // The three sugar forms — a string, an array, and an all-conditions object — are all `{".": v}`.
    return {kind: 'exports-map', targets: {'.': exportsField}, detail: null}
  }
  const targets = {}
  for (const subpath of surface.subpaths) {
    targets[subpath] = isPlainObject(exportsField) ? exportsField[subpath] : undefined
  }
  return {kind: 'exports-map', targets, detail: null}
}

/** `{name, kind}[]` -> `Map<name, kind>`, tolerating an absent or malformed list (A2b: never throw). */
function nameIndex(names) {
  const out = new Map()
  for (const record of Array.isArray(names) ? names : []) {
    if (isPlainObject(record) && typeof record.name === 'string') {
      out.set(record.name, typeof record.kind === 'string' ? record.kind : 'unknown')
    }
  }
  return out
}

/**
 * Codepoint order over `{subpath, name, kind}` — the SAME rule the vendored extractor sorts names
 * by, and for the same reason: a locale-sensitive sort would make the reported delta depend on the
 * ICU locale of whichever machine ran the gate, so two engines could report different orders for
 * the same pair of trees. `localeCompare` is banned here as it is there. JavaScript's `<` compares
 * UTF-16 code units, which also diverges from codepoint order above the BMP, so this walks
 * codepoints explicitly.
 *
 * The field separator is U+0000 written as a backslash-u ESCAPE, never as a raw byte: a literal NUL
 * makes `file(1)` classify this module as binary data and makes grep skip it SILENTLY (finding X9,
 * and the same warning SPEC_FINGERPRINT carries in atlas). A separator is needed rather than a
 * space because an export name is not always an identifier — `export {x as "hello world"}` is legal.
 */
function sortNameRefs(refs) {
  const key = (ref) => `${ref.subpath}\u0000${ref.name}\u0000${ref.kind}`
  return [...refs].sort((left, right) => {
    const a = [...key(left)]
    const b = [...key(right)]
    const shared = Math.min(a.length, b.length)
    for (let i = 0; i < shared; i++) {
      const x = a[i].codePointAt(0)
      const y = b[i].codePointAt(0)
      if (x !== y) {
        return x < y ? -1 : 1
      }
    }
    return a.length === b.length ? 0 : a.length < b.length ? -1 : 1
  })
}

/**
 * The bump the per-subpath NAMED-EXPORT delta requires, for ONE subpath (Level 2).
 *
 *   a name removed              -> MAJOR       a name added                 -> MINOR
 *   TYPED/SFC -> NO_SURFACE     -> MAJOR       NO_SURFACE -> TYPED/SFC      -> MINOR
 *   a `value` became `type`     -> MAJOR       a `type` became `value`      -> MINOR
 *
 * BOTH KINDS BREAK ON REMOVAL. semver-ts.org (Ember RFC 0730) is normative that removing an
 * exported value, interface, type OR namespace is breaking, so `kind` is REPORTING, not a loophole:
 * dropping type-only names from the comparison would make `export interface Options` deletable
 * under a patch. A `value` degrading to a `type` is the same removal wearing a disguise — the value
 * binding is gone — so it majors; the reverse is purely additive.
 *
 * `unknown` (an alias chain that leaves the payload) participates in PRESENCE but never in the kind
 * comparison: the name is right there in the syntax and its removal is a real break, but "I could
 * not resolve what it is" must not manufacture a kind regression out of nothing.
 *
 * `required: null` means a side was INDETERMINATE. As everywhere in this rule that is NOT "no
 * requirement" — the caller must escalate it.
 */
export function subpathNameDelta(subpath, reference, candidate) {
  const referenceClass = reference?.classification
  const candidateClass = candidate?.classification
  if (referenceClass === CLASSIFICATIONS.INDETERMINATE || candidateClass === CLASSIFICATIONS.INDETERMINATE) {
    const side = referenceClass === CLASSIFICATIONS.INDETERMINATE ? 'reference' : 'candidate'
    const detail = (referenceClass === CLASSIFICATIONS.INDETERMINATE ? reference?.detail : candidate?.detail) ?? 'no detail'
    return {required: null, removedNames: [], addedNames: [], detail: `${side} ${subpath}: ${detail}`}
  }
  if (!NAME_BEARING.has(referenceClass) && !NAME_BEARING.has(candidateClass)) {
    return {required: 'none', removedNames: [], addedNames: [], detail: null}
  }
  if (NAME_BEARING.has(referenceClass) && !NAME_BEARING.has(candidateClass)) {
    return {
      required: 'major',
      removedNames: (reference.names ?? []).map((record) => ({subpath, name: record.name, kind: record.kind})),
      addedNames: [],
      detail: `${subpath} no longer has a type surface (${referenceClass} -> ${candidateClass ?? 'absent'}), which revokes every name behind it`
    }
  }
  if (!NAME_BEARING.has(referenceClass) && NAME_BEARING.has(candidateClass)) {
    return {
      required: 'minor',
      removedNames: [],
      addedNames: (candidate.names ?? []).map((record) => ({subpath, name: record.name, kind: record.kind})),
      detail: `${subpath} gained a type surface (${referenceClass ?? 'absent'} -> ${candidateClass})`
    }
  }
  const before = nameIndex(reference.names)
  const after = nameIndex(candidate.names)
  const removedNames = []
  const addedNames = []
  for (const [name, kind] of before) {
    if (!after.has(name)) {
      removedNames.push({subpath, name, kind})
      continue
    }
    const now = after.get(name)
    if (kind === 'value' && now === 'type') {
      // The value binding is gone even though the identifier survives: a removal, not a rename.
      removedNames.push({subpath, name, kind: 'value'})
    } else if (kind === 'type' && now === 'value') {
      addedNames.push({subpath, name, kind: 'value'})
    }
  }
  for (const [name, kind] of after) {
    if (!before.has(name)) {
      addedNames.push({subpath, name, kind})
    }
  }
  const required = removedNames.length > 0 ? 'major' : addedNames.length > 0 ? 'minor' : 'none'
  return {required, removedNames: sortNameRefs(removedNames), addedNames: sortNameRefs(addedNames), detail: null}
}

/**
 * Fold every per-subpath Level-2 delta into ONE requirement, over the UNION of both sides' subpaths.
 *
 * MAX RANK, never min: a MAJOR-requiring removal in one subpath is not softened by a MINOR-requiring
 * addition in another. (That inversion is easy and catastrophic — it would let any breaking change
 * be laundered by shipping an addition alongside it.)
 *
 * The union, not the intersection: a subpath present on only one side is already sized by Level 1,
 * but an INDETERMINATE classification on it must STILL escalate, because "I could not read the
 * surface of a subpath you added" is not evidence that adding it was safe.
 */
export function namesDelta(referenceNames, candidateNames) {
  const subpaths = [...new Set([...Object.keys(referenceNames ?? {}), ...Object.keys(candidateNames ?? {})])].sort()
  let required = 'none'
  const removedNames = []
  const addedNames = []
  const details = []
  for (const subpath of subpaths) {
    const delta = subpathNameDelta(subpath, referenceNames?.[subpath], candidateNames?.[subpath])
    if (delta.required === null) {
      return {required: null, removedNames: [], addedNames: [], detail: delta.detail}
    }
    if (bumpRank(delta.required) > bumpRank(required)) {
      required = delta.required
    }
    removedNames.push(...delta.removedNames)
    addedNames.push(...delta.addedNames)
    if (delta.detail) {
      details.push(delta.detail)
    }
  }
  return {required, removedNames: sortNameRefs(removedNames), addedNames: sortNameRefs(addedNames), detail: details.join('; ') || null}
}

/**
 * The export surface of a PACKED PAYLOAD — the adapter between this engine's tarball
 * representation (Map<path, Buffer>, from readTarball) and the shared rule.
 *
 * LEVEL 1 + LEVEL 2 (spec version 3, atlas decision 0028). The Level-1 half is the manifest read it
 * always was; the Level-2 half runs the vendored extractor over the SAME entry map, which is why
 * this takes the whole tree rather than just the manifest. Both callers already hold the tree —
 * `headFiles` on the candidate side, `refFiles` on the reference side — so this costs no new I/O.
 *
 * A payload with no top-level `package.json` yields `unreadable`, not `legacy`: npm injects
 * the manifest at the package root unconditionally, so its absence means the tarball is not
 * what it claims to be, and that is a "could not tell", not "no exports map".
 *
 * AN EXTRACTOR THROW IS CAUGHT AND TURNED INTO AN ALL-INDETERMINATE NAMES MAP, never allowed to
 * escape and never allowed to degrade into an absent `names` field. A2b applied to the newest
 * dependency in the estate: a `typescript` that fails to load, or one that fails `assertCompiler`'s
 * exact-version guard, must make this engine say "I could not tell" — never crash the whole run,
 * and never fall through to an empty name set that reads as "nothing was removed".
 */
export function surfaceOfPayload(files) {
  const bytes = files.get(MANIFEST_ENTRY)
  const manifestText = bytes === undefined ? null : bytes.toString('utf8')
  const level1 = readExportSurface(manifestText)
  if (level1.kind === 'unreadable') {
    // Nothing to enumerate behind a surface the reader already refused, and `surfaceDelta` treats
    // `unreadable` as INDETERMINATE before it ever looks at names.
    return level1
  }
  try {
    return {...level1, names: extractSurfaceNames({files, manifestText}).names}
  } catch (error) {
    const detail = `the named-export extractor could not run: ${error?.message ?? error}`
    return {
      ...level1,
      names: Object.fromEntries(
        level1.subpaths.map((subpath) => [subpath, {classification: CLASSIFICATIONS.INDETERMINATE, names: [], target: null, detail}])
      )
    }
  }
}

/**
 * The Level-1 VIEW of a surface — the same object with its `names` field dropped.
 *
 * THIS FUNCTION IS THE ENTIRE ADVISORY SEAM (atlas decision 0028 PR 3). Level 2 is computed, folded
 * and reported, and NO exit code moves — because the VERDICT path is handed these stripped views,
 * which makes its evaluation byte-for-byte the spec-version-2 one. `surfaceDelta` treats two
 * names-LESS sides as a genuine Level-1-only comparison, so the arithmetic is identical, not merely
 * similar.
 *
 * "Advisory" is therefore a STRUCTURAL property here, not a promise in a comment: the Level-2
 * outcome reaches only `advisories`, `level2`, `removedNames` and `addedNames`, and `computeExit`
 * reads none of them — it reduces over `row.exitClass` alone.
 *
 * Flipping enforcement (0028 PR 4) is DELETING the two calls, not adding logic. That asymmetry is
 * the point: the advisory phase has to be a strictly smaller change to undo than to keep.
 */
export function level1View(surface) {
  const rest = {...surface}
  delete rest.names
  return rest
}

/**
 * The bump the delta between two surfaces REQUIRES.
 *
 *   removed subpath -> MAJOR      added subpath -> MINOR      neither -> nothing imposed
 *
 * The two cross-kind cases are deterministic rather than guesses, and both follow from what
 * a consumer can actually import:
 *
 *   legacy -> exports-map   introducing an `exports` map REVOKES deep-import access to every
 *                           file that is not listed. That is a removal: MAJOR. (It is the
 *                           most commonly shipped accidental breaking change on npm.)
 *   exports-map -> legacy   removing the map restores unbounded access. Additive: MINOR.
 *
 * `required: null` means a side was unreadable. It is NOT "no requirement" — the caller must
 * turn it into INDETERMINATE.
 *
 * ── LEVEL 2 COMPOSITION (spec version 3, atlas decision 0028) ────────────────────────────────
 *
 * When BOTH surfaces carry a `names` field, the per-subpath named-export delta is folded in at
 * MAX RANK with the subpath-key delta above. Level 2 never REPLACES Level 1 and never softens it
 * — it can only raise the requirement (C147: refine, never relax).
 *
 * WHEN EXACTLY ONE SIDE CARRIES `names`, THE ANSWER IS `required: null`, NOT A LEVEL-1
 * COMPARISON. This is the A2b hole decision 0028 was written around. The reference surface is
 * served from the digest cache, and an entry written before Level 2 existed carries no names at
 * all; if an asymmetric pair quietly degraded to Level 1, a real named-export removal would read
 * as "no names removed" = GREEN off a stale cache. So asymmetry is "I could not read the
 * reference surface", which is exit 3. Two names-LESS sides are a different thing entirely — a
 * genuine Level-1-only comparison — and behave exactly as spec version 2 did, which is both why
 * every v2 vector still passes byte for byte AND what makes `level1View` a sufficient advisory
 * seam rather than an approximation of one.
 */
export function surfaceDelta(reference, candidate) {
  if (reference.kind === 'unreadable' || candidate.kind === 'unreadable') {
    const sides = []
    if (reference.kind === 'unreadable') {
      sides.push(`reference: ${reference.detail ?? 'unreadable'}`)
    }
    if (candidate.kind === 'unreadable') {
      sides.push(`candidate: ${candidate.detail ?? 'unreadable'}`)
    }
    return {required: null, removed: [], added: [], removedNames: [], addedNames: [], detail: sides.join('; ')}
  }
  const level1 = level1Delta(reference, candidate)
  // Level 2 speaks only when BOTH sides declare an `exports` map. A `legacy` side has no subpaths
  // to enumerate names behind, and the two cross-kind cases are already decided at Level 1 by what
  // a consumer can IMPORT (adding a map revokes deep imports: MAJOR; removing one restores them:
  // MINOR). Letting a names comparison speak there would invert the second one.
  if (reference.kind !== 'exports-map' || candidate.kind !== 'exports-map') {
    return {...level1, removedNames: [], addedNames: []}
  }
  const referenceHasNames = isPlainObject(reference.names)
  const candidateHasNames = isPlainObject(candidate.names)
  if (!referenceHasNames && !candidateHasNames) {
    return {...level1, removedNames: [], addedNames: []}
  }
  if (referenceHasNames !== candidateHasNames) {
    const missing = referenceHasNames ? 'candidate' : 'reference'
    return {
      required: null,
      removed: [],
      added: [],
      removedNames: [],
      addedNames: [],
      detail: `the ${missing} surface carries no Level-2 \`names\` field while the other does, so no named-export comparison is possible ` +
        '(a pre-Level-2 cache entry must never read as an empty name set)'
    }
  }
  const level2 = namesDelta(reference.names, candidate.names)
  if (level1.required === null || level2.required === null) {
    return {
      required: null,
      removed: level1.removed,
      added: level1.added,
      removedNames: [],
      addedNames: [],
      detail: [level1.detail, level2.detail].filter(Boolean).join('; ')
    }
  }
  return {
    required: bumpRank(level2.required) > bumpRank(level1.required) ? level2.required : level1.required,
    removed: level1.removed,
    added: level1.added,
    removedNames: level2.removedNames,
    addedNames: level2.addedNames,
    detail: [level1.detail, level2.detail].filter(Boolean).join('; ') || null
  }
}

/** The spec-version-1 and -2 rule, unchanged: subpath KEYS only. Level 2 composes on top of it. */
function level1Delta(reference, candidate) {
  if (reference.kind === 'legacy' && candidate.kind === 'legacy') {
    return {required: 'none', removed: [], added: [], detail: null}
  }
  if (reference.kind === 'legacy') {
    return {
      required: 'major',
      removed: [],
      added: [...candidate.subpaths],
      detail: `the published version declared no "exports" map, so consumers could deep-import any file; declaring ${candidate.subpaths.length} ` +
        'subpath(s) revokes access to everything else'
    }
  }
  if (candidate.kind === 'legacy') {
    return {required: 'minor', removed: [], added: [], detail: 'the "exports" map was removed entirely, restoring unbounded deep-import access (additive)'}
  }
  const referenceSet = new Set(reference.subpaths)
  const candidateSet = new Set(candidate.subpaths)
  const removed = reference.subpaths.filter((subpath) => !candidateSet.has(subpath)).sort()
  const added = candidate.subpaths.filter((subpath) => !referenceSet.has(subpath)).sort()
  if (removed.length > 0) {
    return {required: 'major', removed, added, detail: null}
  }
  if (added.length > 0) {
    return {required: 'minor', removed, added, detail: null}
  }
  return {required: 'none', removed, added, detail: null}
}

/** Release triple only. Prerelease and build metadata are parsed and then ignored. */
function surfaceTriple(value) {
  const parsed = parseSemver(String(value ?? '').trim())
  return parsed === null ? null : {major: parsed.major, minor: parsed.minor, patch: parsed.patch}
}

/**
 * The strongest compatibility promise the move `from` -> `to` breaks.
 *
 * CARET-RANGE semantics, not naive field comparison, and the difference is load-bearing for
 * 0.x packages: `^0.1.2` resolves `>=0.1.2 <0.2.0`, so 0.1.2 -> 0.2.0 breaks a consumer
 * exactly as hard as 1.0.0 -> 2.0.0 does. Reading only the major field would let a 0.x
 * package delete an export under a "minor" and pass — the same class of hole this whole rule
 * exists to close. `^0.0.1` resolves `>=0.0.1 <0.0.2`, so nothing inside 0.0.x is compatible
 * with anything else. This repo ships 0.x packages, so that branch is live, not theoretical.
 *
 * PRERELEASE IDENTIFIERS ARE IGNORED for the level: 1.0.0 -> 2.0.0-rc.1 crosses a major
 * boundary and reads `major`; 1.0.0 -> 1.0.0-rc.1 crosses nothing and reads `none`. A
 * prerelease tag cannot manufacture headroom the release triple does not have.
 *
 * `null` when either version is unparseable — an unknown bump can never CLEAR a requirement.
 */
export function bumpBetween(from, to) {
  const left = surfaceTriple(from)
  const right = surfaceTriple(to)
  if (left === null || right === null) {
    return null
  }
  if (left.major !== right.major) {
    return 'major'
  }
  if (left.major === 0) {
    if (left.minor !== right.minor) {
      return 'major'
    }
    if (left.patch === right.patch) {
      return 'none'
    }
    return left.minor === 0 ? 'major' : 'patch'
  }
  if (left.minor !== right.minor) {
    return 'minor'
  }
  return left.patch === right.patch ? 'none' : 'patch'
}

/**
 * Fail-safe coercion of the OPTIONAL `pendingRelease` input into the same `PendingRelease` union
 * decision 0022 defined for the verdict ladder, so both rules read one shape and one source of
 * truth (the caller passes the SAME measured `pendingRelease` the ladder used, never a
 * re-derivation).
 *
 *   {kind: 'not-measured', reason}        THE DEFAULT. No changeset was measured; grant no credit.
 *   {kind: 'measured', newVersion|null}   Authoritative. `newVersion` is null when this package is
 *                                         not in the computed bump set.
 *   {kind: 'indeterminate', detail}       The probe ran and could not answer.
 *
 * ABSENT / undefined / malformed / an unknown kind ALL collapse to `not-measured` — the projection
 * can only ever SOFTEN a break, so an unreadable input must prove nothing and grant nothing. This
 * matters most here, in a .mjs engine, where no compiler enforces the union.
 */
export function normalizePendingRelease(pendingRelease) {
  if (!isPlainObject(pendingRelease) || typeof pendingRelease.kind !== 'string') {
    return {kind: 'not-measured', reason: 'no pendingRelease supplied'}
  }
  if (pendingRelease.kind === 'measured') {
    return {kind: 'measured', newVersion: typeof pendingRelease.newVersion === 'string' ? pendingRelease.newVersion : null}
  }
  if (pendingRelease.kind === 'not-measured' || pendingRelease.kind === 'indeterminate') {
    return pendingRelease
  }
  return {kind: 'not-measured', reason: `unknown pendingRelease kind ${pendingRelease.kind}`}
}

/**
 * Is `candidate`'s RELEASE TRIPLE strictly greater than `baseline`'s? Prerelease and build metadata
 * are ignored, exactly as `bumpBetween` ignores them — a prerelease tag cannot manufacture a
 * forward move the triple does not have (`2.0.0-rc.1` IS ahead of `1.1.0`; `1.0.0-rc.1` is NOT
 * ahead of `1.0.0`). An unparseable version is NEVER ahead: an unknown version can never earn
 * credit (A2b).
 *
 * This is the direction guard that keeps the changeset credit honest. `bumpBetween` is
 * directionless — `bumpBetween('1.0.0', '0.9.0')` reads `major` because the fields merely differ —
 * so without a direction test a backward (regression-shaped) projection could size to a large bump
 * and excuse a surface break. Requiring the projection to be strictly ahead of the declared
 * on-disk version means the credit can only ever come from a genuine forward release.
 */
function isStrictlyAhead(candidate, baseline) {
  const a = surfaceTriple(candidate)
  const b = surfaceTriple(baseline)
  if (a === null || b === null) {
    return false
  }
  if (a.major !== b.major) {
    return a.major > b.major
  }
  if (a.minor !== b.minor) {
    return a.minor > b.minor
  }
  return a.patch > b.patch
}

/**
 * Decide whether the surface change against `referenceVersion` is covered by a bump.
 *
 * `referenceVersion` is the version whose PUBLISHED tarball the surface was read from — the
 * same reference the payload digest is compared against, so both halves of a row describe
 * the same pair of artifacts. When the declared version is itself already published the two
 * strings are equal, the declared bump is `none`, and ANY surface change breaks: moving the
 * surface of a version already in the registry is a breaking change with no bump at all.
 *
 * ── CHANGESET-AWARENESS (atlas decision 0024, spec version 2) ────────────────────────────────
 *
 * The bump sized here defaults to `referenceVersion -> declared` — the on-disk version, exactly as
 * spec version 1 did. But `changeset version` has not run yet on a PR that defers its bump to a
 * `.changeset/*.md`, so `declared` understates the version that will actually publish. When the
 * caller passes a MEASURED `pendingRelease` (the SAME projected post-`changeset version` version the
 * verdict ladder used — reuse the measured value, never re-derive), the rule sizes against that
 * PROJECTED version instead, under three mandatory safety rules, each with its own conformance
 * vector in the vendored fixture:
 *
 *   1. MANDATORY ADEQUACY. The projection is sized by the SAME `bumpBetween` + `bumpRank` comparison
 *      as the declared version; a projected bump that does not cover the delta still `break`s.
 *   2. NOT-MEASURED / ABSENT / INDETERMINATE FALL BACK. No measured changeset, a package not in the
 *      bump set (`newVersion: null`), or an indeterminate probe all size against `declared` —
 *      byte-for-byte spec-version-1 behaviour.
 *   3. CREDIT ONLY RAISES, NEVER LAUNDERS. Credited only when the projection is BOTH strictly ahead
 *      of `declared` (`isStrictlyAhead`) AND carries a strictly larger bump, so it can only ADD
 *      headroom — never weaken an adequate declared bump, never let a backward projection excuse a
 *      break. VERSION_REGRESSION / LEAKED_ARTIFACT never reach this rule (SURFACE_APPLICABLE_VERDICTS).
 *
 * `declaredBump` in the result is ALWAYS `referenceVersion -> declared` (for reporting continuity);
 * `sizingBump` is the bump actually compared against `delta.required`; `creditedVersion` is the
 * projected version that was credited, or null.
 *
 * @returns {{kind: 'ok'|'break', delta: object, declaredBump: string, sizingBump: string,
 *   creditedVersion: string|null, required?: string} | {kind: 'indeterminate', detail: string}}
 */
export function evaluateSurface({declared, referenceVersion, reference, candidate, pendingRelease}) {
  const delta = surfaceDelta(reference, candidate)
  if (delta.required === null) {
    return {kind: 'indeterminate', detail: `the export surface could not be read (${delta.detail || 'no detail'})`}
  }
  const declaredBump = bumpBetween(referenceVersion, declared)
  if (declaredBump === null) {
    return {kind: 'indeterminate', detail: `cannot size the bump from ${referenceVersion} to ${declared}: one of them is not semver`}
  }

  let sizingBump = declaredBump
  let creditedVersion = null
  const pending = normalizePendingRelease(pendingRelease)
  if (pending.kind === 'measured' && pending.newVersion !== null) {
    const projectedBump = bumpBetween(referenceVersion, pending.newVersion)
    if (projectedBump !== null && isStrictlyAhead(pending.newVersion, declared) && bumpRank(projectedBump) > bumpRank(declaredBump)) {
      sizingBump = projectedBump
      creditedVersion = pending.newVersion
    }
  }

  if (bumpRank(sizingBump) >= bumpRank(delta.required)) {
    return {kind: 'ok', delta, declaredBump, sizingBump, creditedVersion}
  }
  return {kind: 'break', delta, declaredBump, sizingBump, creditedVersion, required: delta.required}
}

/**
 * Turn a LEVEL-2 `evaluateSurface` outcome into advisory strings and reporting fields.
 *
 * AN ADVISORY IS AN OBSERVATION; A VERDICT IS A CLAIM. This mirrors, deliberately and exactly, the
 * `changeset-pending:<v>` pattern atlas decisions 0022/0024 established for the other rule that had
 * to land observed-before-enforced: the row gains strings, `row.verdict` is never touched, and no
 * exit code moves. 0028 PR 4 is what turns `surface-named-break:major` into a real SURFACE_BREAK,
 * once all three engines are on spec version 3.
 *
 *   surface-named-delta:<subpath>:removed:<names>   a name (or kind) vanished from a subpath
 *   surface-named-delta:<subpath>:added:<names>     a name appeared
 *   surface-named-break:<required>                  the delta would break under the declared bump
 *   surface-level2-indeterminate                    the Level-2 surface could not be read at all
 *
 * The LAST of those is the one that matters most while this is advisory: it is how the A2b state
 * stays VISIBLE in a phase where it cannot yet be exit 3. A Level-2 indeterminate that produced no
 * string would be indistinguishable from a clean read, which is the collapse this whole rule exists
 * to prevent — so `surfaceAdvisories` returns a string for it before it returns anything else.
 *
 * @param {{kind: string, delta?: object, required?: string, detail?: string}} outcome
 * @returns {{advisories: string[], level2: string, removedNames: object[], addedNames: object[], level2Detail: string|null}}
 */
export function surfaceAdvisories(outcome) {
  if (outcome.kind === 'indeterminate') {
    return {advisories: ['surface-level2-indeterminate'], level2: 'indeterminate', removedNames: [], addedNames: [], level2Detail: outcome.detail ?? null}
  }
  const removedNames = outcome.delta?.removedNames ?? []
  const addedNames = outcome.delta?.addedNames ?? []
  const advisories = []
  for (const [change, refs] of [['removed', removedNames], ['added', addedNames]]) {
    const bySubpath = new Map()
    for (const ref of refs) {
      bySubpath.set(ref.subpath, [...(bySubpath.get(ref.subpath) ?? []), ref.name])
    }
    // Sort on the SUBPATH explicitly. `[...map].sort()` compares stringified [key, value] PAIRS, so
    // the name list leaks into the ordering and a subpath containing a comma reorders the report.
    for (const [subpath, names] of [...bySubpath].sort((left, right) => (left[0] < right[0] ? -1 : left[0] > right[0] ? 1 : 0))) {
      advisories.push(`surface-named-delta:${subpath}:${change}:${names.join(',')}`)
    }
  }
  if (outcome.kind === 'break') {
    advisories.push(`surface-named-break:${outcome.required}`)
  }
  return {advisories, level2: outcome.kind, removedNames, addedNames, level2Detail: null}
}

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
// The changesets probe — the deep module behind `pendingRelease`
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A bare changeset is a PROMISE to bump, not a bump: the gate measures `package.json` on disk, so a
 * PR carrying a perfectly good `.changeset/*.md` still reads as DRIFT (design-system PR #164). This
 * probe answers, once per workspace, "what version would `changeset version` write for each
 * package?" — the authoritative cascade closure, `ignore`, `pre.json` and
 * `updateInternalDependencies` semantics included, because that closure is NOT derivable from the
 * changeset frontmatter (a changeset naming only `tokens` forced `web` and `fixtures` in #164).
 * `decideVerdict` then grants an excuse iff that version is itself a clean PENDING_PUBLISH. See
 * atlas decision 0022.
 *
 * WHY A SUBPROCESS, not an in-process import: resolution anchored at `repoRoot` means the version
 * that answers is the version that will actually run `changeset version` in THAT repo, changesets
 * ships CJS (a process boundary sidesteps the interop), and it gives a hard timeout. `changeset
 * status` is deliberately NOT used: it makes a git call that cannot resolve in the depth-1 CI
 * checkout and `process.exit(1)`s on the common green-PR case; `getReleasePlan(cwd)` with
 * `sinceRef === undefined` touches git not at all.
 */
const PROBE_TIMEOUT_MS = 30_000

/**
 * The child program. ESM (top-level `await`), imports `@changesets/get-release-plan` resolved
 * against the child's `cwd` (= `repoRoot`), prints `{releases}` to stdout on success, and on any
 * throw writes the message to stderr and exits 9. `readChangesets` parses EVERY changeset before
 * `assembleReleasePlan` runs, so a malformed changeset throws here and can never yield a partial
 * excuse set. changesets ships CJS, hence the interop unwrap; `writeSync` keeps the bytes on the
 * pipe before the child exits.
 */
const PROBE_SOURCE = `
import {writeSync} from 'node:fs'
const repoRoot = process.argv[1]
try {
  const namespace = await import('@changesets/get-release-plan')
  const candidate = namespace.default ?? namespace
  const getReleasePlan = typeof candidate === 'function' ? candidate : (candidate.default ?? candidate.getReleasePlan)
  const plan = await getReleasePlan(repoRoot)
  writeSync(1, JSON.stringify({releases: plan.releases}))
} catch (error) {
  writeSync(2, error && error.message ? String(error.message) : String(error))
  process.exit(9)
}
`

/** The first non-empty line of stderr, truncated, for an indeterminate detail. */
function firstStderrLine(stderr) {
  const line = String(stderr).split('\n').map((entry) => entry.trim()).find((entry) => entry !== '') ?? 'no diagnostic'
  return line.length > 200 ? `${line.slice(0, 200)}…` : line
}

/**
 * Parse the child's stdout into a bump map, or null when the payload is not the shape we expect
 * (subprocess stdout is external data, narrowed rather than trusted), so the caller degrades to
 * INDETERMINATE instead of trusting a malformed answer. `ignore`d packages surface as `type: 'none'`
 * with `newVersion === oldVersion`; the cascade surfaces as a real bump with an empty `changesets`.
 * Keep the latter, drop the former.
 */
export function parseReleasePlan(stdout) {
  let parsed
  try {
    parsed = JSON.parse(stdout)
  } catch {
    return null
  }
  if (!isPlainObject(parsed) || !Array.isArray(parsed.releases)) {
    return null
  }
  const bumps = new Map()
  for (const entry of parsed.releases) {
    if (!isPlainObject(entry)) {
      return null
    }
    const {name, type, newVersion, oldVersion} = entry
    if (typeof name !== 'string' || typeof type !== 'string' || typeof newVersion !== 'string') {
      return null
    }
    if (type !== 'none' && newVersion !== oldVersion) {
      bumps.set(name, newVersion)
    }
  }
  return bumps
}

/**
 * The PURE decision: spawn outcome → probe result. A non-zero exit, a timeout signal, or a spawn
 * error is INDETERMINATE regardless of stdout — the child's exit code is the SOLE success signal, so
 * a probe that trusted stdout on a failed child would read a stalled/failed run as "no bumps".
 * Extracted so this rule is provable without a subprocess.
 */
export function interpretProbeResult(result) {
  if (result.error !== undefined || result.signal !== null || result.status !== 0) {
    const detail = result.signal === null ? firstStderrLine(result.stderr) : `changeset probe timed out after ${PROBE_TIMEOUT_MS}ms`
    return {kind: 'indeterminate', detail}
  }
  const bumps = parseReleasePlan(result.stdout)
  if (bumps === null) {
    return {kind: 'indeterminate', detail: 'changeset probe stdout was not a parseable release plan'}
  }
  return {kind: 'measured', bumps}
}

/**
 * Resolve the pending release plan for the whole workspace at `repoRoot`. Every ambiguity resolves
 * toward blocking: a repo with no `.changeset/config.json` is `not-measured` (no excuse, DRIFT
 * stands — the LP/OMD property), and a probe that ran and could not answer is `indeterminate` (a
 * would-be DRIFT becomes exit 3).
 */
export function resolvePendingRelease(repoRoot) {
  const changesetDir = path.join(repoRoot, '.changeset')
  const configPath = path.join(changesetDir, 'config.json')
  if (!fs.existsSync(configPath)) {
    // A `.changeset/` directory carrying changeset files but no config.json is a broken setup, not
    // "not a changesets repo" — that is indeterminate, not a silent not-measured.
    if (fs.existsSync(changesetDir)) {
      const hasChangesetFiles = fs.readdirSync(changesetDir).some((entry) => entry.endsWith('.md') && entry.toLowerCase() !== 'readme.md')
      if (hasChangesetFiles) {
        return {kind: 'indeterminate', detail: '.changeset/ holds changeset files but no config.json'}
      }
    }
    return {kind: 'not-measured', reason: 'no .changeset/config.json'}
  }

  const resolver = createRequire(pathToFileURL(path.join(repoRoot, 'package.json')))
  try {
    resolver.resolve('@changesets/get-release-plan')
  } catch {
    return {kind: 'indeterminate', detail: `@changesets/get-release-plan is not installed in ${repoRoot}, but .changeset/config.json exists`}
  }

  const result = spawnSync(process.execPath, ['--input-type=module', '-e', PROBE_SOURCE, repoRoot], {
    cwd: repoRoot,
    timeout: PROBE_TIMEOUT_MS,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  })
  return interpretProbeResult(result)
}

/** Narrow the workspace probe to the per-package signal `decideVerdict` consumes. */
export function pendingReleaseFor(probe, packageName) {
  if (probe.kind === 'measured') {
    return {kind: 'measured', newVersion: probe.bumps.get(packageName) ?? null}
  }
  return probe
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 7 — Verdict
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PURE. The verdict is a function of the registry version set, the declared version, whether the
 * packed payload matches the reference tarball, and an optional changesets probe signal — and of
 * NOTHING ELSE. In particular it does not take the lane.
 *
 * `payloadMatchesReference` is `true`/`false`/`null` (null = the reference could not be compared →
 * INDETERMINATE, A2b). `pendingRelease` is the per-package changesets probe result; absent/undefined
 * MUST read as `{kind:'not-measured'}` — the FAIL-SAFE DEFAULT, so a repo the probe never ran on (LP,
 * OMD) behaves identically to before this field existed.
 *
 * M7: a verdict is never rewritten to satisfy an exit code. `verdict` is the truth and `exitClass`
 * is the only lane-dependent field. Because the reference is the registry rather than a git ref,
 * "declared version IS published but the payload differs" is ALWAYS a genuine defect — `changeset
 * publish` skips versions already in the registry — UNLESS a pending changeset adequately covers it
 * (PENDING_CHANGESET). This is the ONLY verdict the changeset excuse may relabel, and only when the
 * projected version is itself a clean PENDING_PUBLISH (the mandatory adequacy test below). See atlas
 * decision 0022; this engine is held byte-for-byte to the shared contract by verdict-conformance.json.
 */
export function decideVerdict({declared, registryVersions, payloadMatchesReference, pendingRelease}) {
  const advisories = []
  if (registryVersions.length === 0) {
    return {verdict: 'NEVER_PUBLISHED', referenceVersion: null, advisories}
  }
  const max = semverMax(registryVersions)
  const published = registryVersions.includes(declared)
  const referenceVersion = published ? declared : max

  // "Could not tell" is exit 3, never a pass (A2b). Sits BEFORE the position split so it protects
  // published and unpublished packages equally.
  if (payloadMatchesReference === null) {
    return {verdict: 'INDETERMINATE', referenceVersion, advisories: [...advisories, 'reference-payload-unavailable']}
  }

  if (published) {
    if (max !== null && max !== declared) {
      advisories.push('behind-registry')
    }
    if (payloadMatchesReference === true) {
      return {verdict: 'CLEAN', referenceVersion, advisories}
    }

    // ── The changeset excuse. Reached ONLY from the DRIFT position. ─────────────────────────────
    // Unreachable from every other verdict by construction, not by a guard: NEVER_PUBLISHED,
    // VERSION_REGRESSION and the BUMP_NOT_NEEDED/PENDING_PUBLISH arm all `return` before here, and
    // the excuse sits inside the `published && !matches` position. A mutant cannot delete a guard
    // that does not exist.
    const pending = pendingRelease ?? {kind: 'not-measured', reason: 'caller supplied none'}
    if (pending.kind === 'indeterminate') {
      return {verdict: 'INDETERMINATE', referenceVersion, advisories: [...advisories, `changeset-probe-failed:${pending.detail}`]}
    }
    if (pending.kind === 'measured' && pending.newVersion !== null) {
      // ADEQUACY, and it is MANDATORY. Re-run THIS SAME LADDER with the version `changeset version`
      // would write. Depth is exactly 1: the recursive call passes not-measured, so it can never
      // itself become PENDING_CHANGESET. Grant the excuse iff that version is a clean PENDING_PUBLISH
      // — anything else keeps DRIFT (a patch that projects onto an already-published number would let
      // `changeset publish` skip it silently, the exact C147 failure this gate exists to prevent).
      const projected = decideVerdict({
        declared: pending.newVersion,
        registryVersions,
        payloadMatchesReference: false,
        pendingRelease: {kind: 'not-measured', reason: 'projection'}
      })
      if (projected.verdict === 'PENDING_PUBLISH') {
        return {verdict: 'PENDING_CHANGESET', referenceVersion, advisories: [...advisories, `changeset-target:${pending.newVersion}`]}
      }
      advisories.push(`changeset-inadequate:${pending.newVersion}->${projected.verdict}`)
    }
    return {verdict: 'DRIFT', referenceVersion, advisories}
  }
  if (compareSemver(declared, max) > 0) {
    return {verdict: payloadMatchesReference === true ? 'BUMP_NOT_NEEDED' : 'PENDING_PUBLISH', referenceVersion, advisories}
  }
  return {verdict: 'VERSION_REGRESSION', referenceVersion, advisories}
}

export function exitClassFor(verdict, lane) {
  // An unrecognised LANE throws — it would otherwise fail the `post-publish` comparison silently and
  // downgrade a blocking verdict to a pass. The shared contract pins this for the two `.mjs` engines
  // that have no compiler (the `__UNKNOWN_LANE__` vectors in verdict-conformance.json).
  if (!LANES.includes(lane)) {
    throw new Error(`unknown lane ${lane}`)
  }
  switch (verdict) {
    case 'CLEAN':
    case 'BUMP_NOT_NEEDED':
    case 'SKIPPED':
      return EXIT_OK
    case 'PENDING_PUBLISH':
    case 'PENDING_CHANGESET':
    case 'NEVER_PUBLISHED':
      // On a branch this is correct: consumers still resolve the published version and the pending
      // payload is exactly what the publish workflow will ship (or, for PENDING_CHANGESET, what
      // `changeset version` will move the number to in the release lane). After that workflow has
      // run it must not persist — that is the "main is green while consumers still resolve the stale
      // tarball" window (finding H2). PENDING_CHANGESET tracks PENDING_PUBLISH exactly.
      return lane === 'post-publish' ? EXIT_BLOCK : EXIT_OK
    case 'DRIFT':
    case 'VERSION_REGRESSION':
    case 'LEAKED_ARTIFACT':
      return EXIT_BLOCK
    case 'SURFACE_BREAK':
      // BLOCKING IN EVERY LANE, deliberately — unlike PENDING_PUBLISH above, which is the
      // state this defect hid inside. The lane changes SEVERITY, never a verdict, and there
      // is no lane in which shipping a removed entry point under an insufficient bump is
      // acceptable: by the time the post-publish lane runs, consumers on a caret range have
      // already resolved the tarball that lost the subpath. `@j0nathan-ll0yd/web@1.1.0` was
      // PENDING_PUBLISH / exit 0 on the branch that shipped it.
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

/**
 * THE SURFACE AND EXTRACT VERSIONS PARTICIPATE IN THE CACHE KEY (atlas decision 0028 §2.4b).
 *
 * The entry is ONE file holding BOTH the digest hashes and the surface, so moving the key on a
 * `SURFACE_SPEC_VERSION` or `EXTRACT_SPEC_VERSION` bump invalidates the WHOLE combined entry — the
 * digest portion included — and forces a full re-fetch, re-digest and re-extract of every package.
 * That over-invalidation is ACCEPTED, not avoided: bumps are rare, the cost is one cold pass, and
 * correctness dominates. There is no claim of selective digest preservation here.
 *
 * WHY THE KEY, WHEN `readCache` ALREADY CHECKS THE VERSION FIELDS. They answer different questions,
 * and only together do they close the hole. The field check asks "is this the right SHAPE?"; the key
 * asks "was this produced by the right RULE?". An entry written by a superseded extractor is
 * SCHEMA-VALID — it carries a `names` field, so no shape check has any reason to reject it — while
 * its names are simply wrong. Only the key catches that one.
 */
function cacheFile(repoRoot, name, version) {
  const scheme = `v${SPEC_VERSION}-s${SURFACE_SPEC_VERSION}-e${EXTRACT_SPEC_VERSION}`
  return path.join(repoRoot, 'node_modules', '.cache', 'pkg-drift', scheme, `${sha256(`${name}@${version}`)}.json`)
}

/**
 * THE REFERENCE SURFACE IS CACHED ALONGSIDE THE REFERENCE DIGESTS, not fetched separately.
 * Both are read out of the same immutable published tarball, so caching one and not the
 * other would mean downloading it twice — or, worse, tempt a later edit into reading the
 * surface from something that is not the reference at all.
 *
 * THE SPEC_VERSION KEY IS DELIBERATELY NOT BUMPED FOR THIS. That number means "the digest
 * bytes changed", and they have not: every cached digest written before this change is still
 * exactly correct. Bumping it would discard a valid estate-wide cache to express something
 * it does not mean. Narrowing on the SHAPE is what makes that safe — an entry written before
 * the field existed fails the check below and is refetched, which costs one download and can
 * never produce a wrong answer. `surfaceSpecVersion` is checked too, so a future surface-rule
 * bump invalidates surfaces without touching digests.
 */
const cachedSurfaceIsUsable = (surface) => isPlainObject(surface) && typeof surface.kind === 'string' && Array.isArray(surface.subpaths)

export function readCache(repoRoot, name, version) {
  try {
    const parsed = JSON.parse(fs.readFileSync(cacheFile(repoRoot, name, version), 'utf8'))
    if (parsed.specVersion !== SPEC_VERSION || parsed.surfaceSpecVersion !== SURFACE_SPEC_VERSION || parsed.extractSpecVersion !== EXTRACT_SPEC_VERSION) {
      return null
    }
    if (!cachedSurfaceIsUsable(parsed.surface)) {
      return null
    }
    // GUARD (a), atlas decision 0028 §2.4a — the second net behind the cache key, and the one that
    // catches a hand-written or half-migrated entry that lands at a v3 key WITHOUT the v3 schema.
    // `acceptsCachedSurface` is the vendored contract's own test and it keys off the PRESENCE of
    // the `names` field, never its emptiness: a package whose every subpath is an asset carries a
    // legitimately empty name set BY DESIGN, and rejecting on emptiness would send those packages
    // back to the registry on every run, forever, for no signal.
    //
    // A rejected entry is a cache MISS, not a verdict. It costs one download and re-extract; it can
    // never produce a wrong answer. The verdict-level fail-closed layer is `surfaceDelta`'s
    // asymmetry branch, which fires only if that recovery cannot produce names either.
    if (!acceptsCachedSurface(parsed.surface)) {
      return null
    }
    // The per-file digests are Maps in memory and plain objects on disk. `names` is carried through
    // VERBATIM — dropping it here is exactly the A2b hole 0028 was written around, because the
    // reference side is served from this cache in steady state and a names-less reference would
    // make a real named-export removal read as "no names removed".
    return {
      strictPerFile: new Map(Object.entries(parsed.strictPerFile)),
      effectivePerFile: new Map(Object.entries(parsed.effectivePerFile)),
      surface: {
        kind: parsed.surface.kind,
        subpaths: [...parsed.surface.subpaths],
        detail: parsed.surface.detail ?? null,
        ...(isPlainObject(parsed.surface.names) ? {names: parsed.surface.names} : {})
      }
    }
  } catch {
    return null
  }
}

export function writeCache(repoRoot, name, version, {strictPerFile, effectivePerFile, surface}) {
  try {
    const file = cacheFile(repoRoot, name, version)
    fs.mkdirSync(path.dirname(file), {recursive: true})
    fs.writeFileSync(file,
      JSON.stringify({
        specVersion: SPEC_VERSION,
        surfaceSpecVersion: SURFACE_SPEC_VERSION,
        extractSpecVersion: EXTRACT_SPEC_VERSION,
        name,
        version,
        strictPerFile: Object.fromEntries(strictPerFile),
        effectivePerFile: Object.fromEntries(effectivePerFile),
        surface
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
  changesetProbe = undefined,
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

  // The changesets probe runs ONCE per workspace, never per package: it reads the whole release
  // plan (cascade closure included) in a single subprocess. A repo with no `.changeset/config.json`
  // returns not-measured before any I/O, so the verdict is byte-identical to before this existed.
  // The self-test injects a synthetic probe through `changesetProbe`; production leaves it undefined.
  const probe = changesetProbe ?? resolvePendingRelease(repoRoot)

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
              // The surface is read from the SAME tarball bytes as the digests, in the same
              // pass, so the two halves of the row cannot describe different artifacts.
              reference = {
                version: referenceVersion,
                strictPerFile: ref.strictEntries,
                effectivePerFile: ref.effectiveEntries,
                surface: surfaceOfPayload(refFiles)
              }
              // Only the immutable published payload is cached; the packument never is,
              // so registry reachability is re-proven on every single run.
              if (useCache) {
                writeCache(repoRoot, member.name, referenceVersion, {
                  strictPerFile: reference.strictPerFile,
                  effectivePerFile: reference.effectivePerFile,
                  surface: reference.surface
                })
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

      const pendingRelease = pendingReleaseFor(probe, member.name)
      const decision = decideVerdict({declared: member.version, registryVersions, payloadMatchesReference: headDigest === refDigest, pendingRelease})

      const advisories = [...decision.advisories]
      if (!strictMaps && strictDigest !== effectiveDigest) {
        advisories.push('cosmetic-only')
      }

      // ── Step 7b — did the PUBLIC SURFACE shrink? ────────────────────────────
      //
      // Applied ONLY over a successfully-compared pair, and against the SAME
      // `decision.referenceVersion` the payload digest used, so both halves of the row
      // describe the same two artifacts. NEVER_PUBLISHED has no reference surface;
      // VERSION_REGRESSION is a more fundamental defect in the same exit class.
      let verdict = decision.verdict
      let surfaceReason = null
      let removedSubpaths = []
      let addedSubpaths = []
      let requiredBump = null
      let declaredBump = null
      let level2 = null
      let level2Detail = null
      let removedNames = []
      let addedNames = []
      if (SURFACE_APPLICABLE_VERDICTS.has(decision.verdict)) {
        const candidateSurface = surfaceOfPayload(headFiles)
        // ── LEVEL 1 SIZES THE VERDICT (atlas decision 0028 PR 3 — ADVISORY FIRST) ────────────
        //
        // `level1View` strips `names` from BOTH sides, which makes this call byte-for-byte the
        // spec-version-2 evaluation: `surfaceDelta` treats two names-less sides as a genuine
        // Level-1-only comparison, not as a degraded Level-2 one. So no exit code in this engine
        // can move because of a named delta while Level 2 is advisory — and the transient window
        // where atlas is on v3 and mantle is still on v2 stays fail-SAFE rather than fail-blocking.
        //
        // 0028 PR 4 flips enforcement by DELETING the two `level1View` calls. Nothing else.
        const outcome = evaluateSurface({
          declared: member.version,
          referenceVersion: decision.referenceVersion,
          reference: level1View(reference.surface),
          candidate: level1View(candidateSurface),
          // The SAME measured pendingRelease the verdict ladder consumed (decision 0024): one source
          // of truth, never a re-derivation. An adequate projected bump credits the surface delta;
          // not-measured/absent/indeterminate/backward all fall back to the declared version.
          pendingRelease
        })
        // ── LEVEL 2 IS OBSERVED, NOT ENFORCED ────────────────────────────────────────────────
        //
        // The SAME rule over the SAME two surfaces WITH their names, and the SAME `pendingRelease`
        // the verdict path just used — so when enforcement flips, the number it flips to is the one
        // that was being reported all along, not a differently-sized one. Its outcome reaches only
        // `advisories`, `level2`, `removedNames` and `addedNames`. None of those is read by
        // `exitClassFor`, `decideVerdict` or `computeExit` (which reduces over `row.exitClass`
        // alone), which is what makes "advisory" a structural property here rather than a promise.
        const level2Outcome = evaluateSurface({
          declared: member.version,
          referenceVersion: decision.referenceVersion,
          reference: reference.surface,
          candidate: candidateSurface,
          pendingRelease
        })
        const level2Shape = surfaceAdvisories(level2Outcome)
        level2 = level2Shape.level2
        // An INDETERMINATE with no reason is unactionable, and while Level 2 is advisory the reason
        // is the ONLY thing a maintainer gets — there is no exit code to investigate from.
        level2Detail = level2Shape.level2Detail
        removedNames = level2Shape.removedNames
        addedNames = level2Shape.addedNames
        advisories.push(...level2Shape.advisories)
        if (outcome.kind === 'indeterminate') {
          // A2b, one level below the digest: "I could not read the public surface" is exit
          // 3, NEVER a fall-through to whatever the payload comparison happened to say. A
          // surface that cannot be read cannot be shown not to have shrunk.
          verdict = 'INDETERMINATE'
          surfaceReason = `the export surface could not be evaluated — ${outcome.detail}`
        } else {
          removedSubpaths = [...outcome.delta.removed]
          addedSubpaths = [...outcome.delta.added]
          requiredBump = outcome.delta.required
          declaredBump = outcome.declaredBump
          if (outcome.kind === 'break') {
            verdict = 'SURFACE_BREAK'
            surfaceReason = `the export surface changed in a way that requires a ${outcome.required.toUpperCase()} bump, but ` +
              `${decision.referenceVersion} -> ${member.version} is a ${outcome.declaredBump} bump` +
              (removedSubpaths.length > 0
                ? `. Consumers importing ${removedSubpaths.map((subpath) => `"${subpath}"`).join(', ')} lose that entry point on their next install`
                : `. ${outcome.delta.detail ?? ''}`)
          }
        }
      }

      push({
        name: member.name,
        path: member.path,
        declared: member.version,
        referenceVersion: decision.referenceVersion,
        verdict,
        ...(surfaceReason ? {reason: surfaceReason} : {}),
        advisories,
        differingFiles: refCompare ? differingFiles(headEffectivePerFile, refCompare) : [],
        cosmeticPaths: [...headDeadMaps].sort(),
        leakedPaths: [],
        removedSubpaths,
        addedSubpaths,
        requiredBump,
        declaredBump,
        // Level 2 (atlas decision 0028), REPORTING ONLY in this PR. `surfaceSpecVersion` and
        // `extractSpecVersion` ride on the row so a consumer of `--json` can tell which rule and
        // which extractor produced these names without inferring it from their shape.
        surfaceSpecVersion: SURFACE_SPEC_VERSION,
        extractSpecVersion: EXTRACT_SPEC_VERSION,
        level2,
        level2Detail,
        removedNames,
        addedNames,
        pendingNewVersion: pendingRelease.kind === 'measured' ? pendingRelease.newVersion : null,
        changesetProbe: probe.kind,
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

  console.log(
    `\npackage payload drift — lane=${result.lane}, digest spec v${SPEC_VERSION}, export-surface spec v${SURFACE_SPEC_VERSION} ` +
      `(Level 2 ADVISORY, extract spec v${EXTRACT_SPEC_VERSION}, typescript ${EXPECTED_TS_VERSION})\n`
  )
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
    // Printed whenever the surface MOVED, not only when it broke: an addition under a patch
    // is legal and silent in the exit code, but a reader diffing two runs should still be
    // able to see that the public surface is not what it was.
    for (const subpath of row.removedSubpaths ?? []) {
      console.log(`      export REMOVED: ${subpath}`)
    }
    for (const subpath of row.addedSubpaths ?? []) {
      console.log(`      export added:   ${subpath}`)
    }
    if ((row.removedSubpaths?.length ?? 0) + (row.addedSubpaths?.length ?? 0) > 0) {
      console.log(`      surface bump: requires ${row.requiredBump}, declared ${row.declaredBump}`)
    }
    // Level 2, ADVISORY (atlas decision 0028 PR 3). Printed as OBSERVATIONS and labelled as such:
    // none of these lines corresponds to anything in the exit code, and saying so in the output is
    // what stops a reader treating an advisory as a verdict during the phase where it is not one.
    for (const ref of row.removedNames ?? []) {
      console.log(`      export NAME removed (advisory): ${ref.subpath} -> ${ref.name} (${ref.kind})`)
    }
    for (const ref of row.addedNames ?? []) {
      console.log(`      export name added  (advisory): ${ref.subpath} -> ${ref.name} (${ref.kind})`)
    }
    if (row.level2 === 'indeterminate') {
      console.log(`      level 2 INDETERMINATE (advisory — moves no exit code until 0028 PR 4): ${row.level2Detail ?? 'no detail'}`)
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
  const throttles = new Map() // name -> count of packument reads still to answer with 403
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
    // A momentary GitHub Packages throttle (finding behind REQUEST_ATTEMPTS): 403 the next N
    // packument reads for `name`, then serve normally. Scoped to the packument route so a
    // tarball fetch is unaffected, and self-clearing so later scenarios see a healthy
    // registry — exactly the transient burst the transport retry exists to ride out.
    const remainingThrottle = throttles.get(name) ?? 0
    if (remainingThrottle > 0) {
      throttles.set(name, remainingThrottle - 1)
      res.writeHead(403, {'content-type': 'application/json'}).end('{"error":"throttled"}')
      return
    }
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
    // Refuse the next `times` packument reads for `name` with 403, then serve normally.
    throttle(name, times) {
      throttles.set(name, times)
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
 * A workspace that stands up the REAL changesets machinery, for the S26 cascade rung — the only
 * place --self-test exercises the actual `@changesets/get-release-plan` probe rather than an
 * injected result. `@toy/csdep` depends on `@toy/csleaf` by `workspace:*`, and the sole changeset
 * names ONLY the leaf; `updateInternalDependencies: patch` bumps the dependent anyway, with an empty
 * `changesets` — the cascade closure a frontmatter-only gate would miss (design-system PR #164). The
 * probe resolves `@changesets/get-release-plan` from this root, so we symlink the scope already
 * installed in THIS repo's node_modules (the same tree the real gate resolves). getReleasePlan with
 * no `sinceRef` touches git not at all, so no history is needed beyond the initial commit.
 */
function buildChangesetCascadeFixture(registryUrl) {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'pkg-drift-cascade-')))
  fs.mkdirSync(path.join(root, 'packages', 'csleaf', 'src'), {recursive: true})
  fs.mkdirSync(path.join(root, 'packages', 'csdep', 'src'), {recursive: true})
  fs.writeFileSync(path.join(root, 'pnpm-workspace.yaml'), "packages:\n  - 'packages/*'\n")
  fs.writeFileSync(path.join(root, '.gitignore'), 'dist/\nnode_modules/\n')
  fs.writeFileSync(path.join(root, 'build.js'), BUILD_JS)
  writeJson(path.join(root, 'package.json'), {name: 'drift-cascade-root', private: true, version: '0.0.0', scripts: {build: 'pnpm -r run build'}})
  writeJson(path.join(root, 'turbo.json'), {tasks: {build: {outputs: ['dist/**']}}})
  writeJson(path.join(root, 'packages', 'csleaf', 'package.json'), {
    name: '@toy/csleaf',
    version: '1.0.0',
    files: ['dist'],
    publishConfig: {registry: registryUrl},
    scripts: {build: 'node ../../build.js'}
  })
  writeJson(path.join(root, 'packages', 'csdep', 'package.json'), {
    name: '@toy/csdep',
    version: '1.0.0',
    files: ['dist'],
    dependencies: {'@toy/csleaf': 'workspace:*'},
    publishConfig: {registry: registryUrl},
    scripts: {build: 'node ../../build.js'}
  })
  fs.writeFileSync(path.join(root, 'packages', 'csleaf', 'src', 'index.js'), 'module.exports = 1\n')
  fs.writeFileSync(path.join(root, 'packages', 'csdep', 'src', 'index.js'), 'module.exports = 2\n')
  fs.mkdirSync(path.join(root, '.changeset'), {recursive: true})
  writeJson(path.join(root, '.changeset', 'config.json'), {
    changelog: false,
    commit: false,
    access: 'restricted',
    baseBranch: 'main',
    updateInternalDependencies: 'patch',
    ignore: [],
    fixed: [],
    linked: []
  })
  fs.writeFileSync(path.join(root, '.changeset', 'bump-leaf.md'), '---\n"@toy/csleaf": patch\n---\n\nbump the leaf only\n')
  fs.mkdirSync(path.join(root, 'node_modules'), {recursive: true})
  fs.symlinkSync(fs.realpathSync(path.join(repoRoot, 'node_modules', '@changesets')), path.join(root, 'node_modules', '@changesets'))
  git(root, 'init', '-q')
  git(root, 'config', 'user.email', 'selftest@example.invalid')
  git(root, 'config', 'user.name', 'drift self-test')
  git(root, 'add', '-A')
  git(root, 'commit', '-qm', 'cascade fixture')
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

  // PERF: `build` defaults to FALSE here, the inverse of runGate's own default. The fixture is
  // built ONCE per suite run (S1's explicit runWorkspaceBuild, and S14's for the npmpub package),
  // and no scenario's payload changes between rungs unless it edits src/** or build.js — so a
  // per-rung `pnpm -r run build` only re-copies identical bytes. Rebuilding on every gate() was the
  // dominant cost of --self-test: ~9 pnpm spawns per suite run, and the 24 mutation subprocesses
  // each re-run the suite. The FOUR rungs that mutate a build input (S2 edits leaf src, S9/S9b
  // rewrite build.js, S23 edits leaf src) pass build:true explicitly; every other rung reuses the
  // dist the prior build produced. This does NOT weaken A2b: `--no-build` is a shipped production
  // code path (S14/S15/S21/S22 already exercised it), and any rung that needs a rebuild but does not
  // get one FAILS ITS EXACT-VERDICT ASSERTION in the baseline — a red run, never a silent pass.
  const gate = (overrides = {}) =>
    evaluator.runGate({
      repoRoot: root,
      registry: registryUrl,
      scope: '@toy',
      token: 'selftest-token',
      useCache: false,
      concurrency: 2,
      build: false,
      ...overrides
    })

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

    // S27 — A THROTTLED PACKUMENT RECOVERS ON RETRY. The flake that stalled the release train
    // (findings behind #158/#161): GitHub Packages answers 403 during a merge burst, and one
    // unretried 403 sends a package INDETERMINATE and exits the gate 3. The transport retries
    // (REQUEST_ATTEMPTS), so a momentary throttle must land EXACTLY where a never-throttled read
    // does — CLEAN / exit 0 — off the same clean tree S1 just proved. Throttle the leaf's next
    // two reads (retries 1 and 2 eat them; attempt 3 serves the packument); dependent is
    // untouched. The `retryoff` mutation (REQUEST_ATTEMPTS 4 -> 1) makes the first 403 final:
    // leaf becomes auth -> INDETERMINATE and this assertion goes red, killing the mutant.
    registry.throttle('@toy/leaf', 2)
    result = await gate()
    expect('S27 a throttled packument recovers on retry', result, '@toy/leaf', 'CLEAN', 0)

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
    result = await gate({build: true}) // edits leaf src → dist must be rebuilt for the drift to surface
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

    // S22 — DID THE PUBLIC SURFACE SHRINK? (the export-surface rule, spec v2)
    //
    // THE MEASURED GAP, and the reason this rung exists at all. Every scenario above
    // compares PAYLOADS, and a removed entry point is invisible to that question: the
    // payload legitimately differs and the version is legitimately ahead of the registry,
    // which is PENDING_PUBLISH — exit 0 on a branch. @j0nathan-ll0yd/web@1.1.0, a package
    // of THIS repo, removed the `./types/*` subpath from its exports map and shipped as a
    // MINOR with every gate in the estate green; consumers on `^1.0.0` lost an entry point
    // on their next install. S22b reproduces that shape end to end.
    //
    // S22c IS THE NEGATIVE CONTROL AND IT IS NOT OPTIONAL. The rule is a BUMP rule, not a
    // ban on removing exports. A gate that blocked every surface change — or simply blocked
    // everything — would pass S22b and look correct.
    const surfaceDir = path.join(root, 'packages', 'surface')
    const setSurface = (version, exportsField) =>
      writeJson(path.join(surfaceDir, 'package.json'), {
        name: '@toy/surface',
        version,
        files: ['src'],
        exports: exportsField,
        publishConfig: {registry: registryUrl}
      })
    const surfaceRow = (evaluated) => row(evaluated, '@toy/surface') ?? {}
    fs.mkdirSync(path.join(surfaceDir, 'src', 'types'), {recursive: true})
    fs.writeFileSync(path.join(surfaceDir, 'src', 'index.js'), 'module.exports = "surface"\n')
    fs.writeFileSync(path.join(surfaceDir, 'src', 'types', 'thing.js'), 'module.exports = {}\n')
    setSurface('1.0.0', {'.': './src/index.js', './types/*': './src/types/*.js'})
    commitAll(root, 'add a package with a two-subpath export surface')
    registry.publish('@toy/surface', '1.0.0', await packFixture(root, 'surface'))

    result = await gate({build: false})
    expect('S22 an unchanged surface is CLEAN', result, '@toy/surface', 'CLEAN', 0)
    check('S22 an unchanged surface is QUIET — no subpath churn is reported',
      (surfaceRow(result).removedSubpaths ?? []).length === 0 && (surfaceRow(result).addedSubpaths ?? []).length === 0,
      `removed=${JSON.stringify(surfaceRow(result).removedSubpaths)} added=${JSON.stringify(surfaceRow(result).addedSubpaths)}`)

    // S22b — THE REGRESSION, verbatim: drop a subpath and ship it as a MINOR.
    setSurface('1.1.0', {'.': './src/index.js'})
    commitAll(root, 'remove the ./types/* subpath under a minor')
    result = await gate({build: false})
    expect('S22b a removed subpath under a MINOR is SURFACE_BREAK', result, '@toy/surface', 'SURFACE_BREAK', 2)
    check('S22b names the removed subpath and both bump levels',
      (surfaceRow(result).removedSubpaths ?? []).includes('./types/*') && surfaceRow(result).requiredBump === 'major' &&
        surfaceRow(result).declaredBump === 'minor',
      `removed=${JSON.stringify(surfaceRow(result).removedSubpaths)} required=${surfaceRow(result).requiredBump} declared=${
        surfaceRow(result).declaredBump
      }`)
    // The lane changes SEVERITY, never a verdict — and unlike PENDING_PUBLISH, which this
    // defect hid inside, there is no lane in which a removed entry point under too small a
    // bump is acceptable.
    for (const surfaceLane of LANES) {
      const laneResult = await gate({build: false, lane: surfaceLane})
      expect(`S22b SURFACE_BREAK blocks in the ${surfaceLane} lane`, laneResult, '@toy/surface', 'SURFACE_BREAK', 2)
    }

    // S22c — THE NEGATIVE CONTROL. The SAME removal under a MAJOR must pass, and must leave
    // the whole run at exit 0 — asserted explicitly, because `expect` only checks that the
    // process code is at least as severe as the row's class and 0 is satisfied by anything.
    setSurface('2.0.0', {'.': './src/index.js'})
    commitAll(root, 'republish the same removal as the major it should have been')
    result = await gate({build: false})
    expect('S22c the SAME removal under a MAJOR passes', result, '@toy/surface', 'PENDING_PUBLISH', 0)
    check('S22c a correctly-bumped removal leaves the whole run green', result.exitCode === 0,
      `exitCode=${result.exitCode} — rows=${JSON.stringify(result.rows.map((r) => `${r.name}:${r.verdict}:${r.exitClass}`))}`)

    // S22d — A2b AT THE SURFACE LAYER. `"exports": 42` is a shape Node does not accept, so
    // the surface cannot be read at all. "I could not tell" is exit 3, never a fall-through
    // to whatever the payload comparison happened to say — which here would be a pass.
    setSurface('2.0.0', 42)
    commitAll(root, 'an exports field no reader can classify')
    result = await gate({build: false})
    expect('S22d an unreadable export surface is INDETERMINATE', result, '@toy/surface', 'INDETERMINATE', 3)
    check('S22d the row says WHY the surface could not be read', /export surface/.test(surfaceRow(result).reason ?? ''),
      `reason=${JSON.stringify(surfaceRow(result).reason)}`)

    // ── S22e–S22j — CHANGESET-AWARE SURFACE (atlas decision 0024, spec v2). ──────────────────────
    //
    // A surface removal deferred to a `.changeset/*.md` reads as a small `declaredBump` on disk and
    // would SURFACE_BREAK under v1 (that is exactly S22b — the DS #164 tax). v2 sizes the delta
    // against the MEASURED projected version instead — the SAME per-package `pendingRelease` the
    // verdict ladder consumes — but only under three mandatory safety rules. These rungs pin all
    // four properties end to end, and the `surfacechangeset*` mutants below each break exactly one.
    // The on-disk state is IDENTICAL across the cluster (declared 1.0.1, the ./types/* removal, a
    // patch that never covers a MAJOR removal); ONLY the injected probe changes, so the delta
    // between a PASS and a BREAK is purely the projected credit.
    setSurface('1.0.1', {'.': './src/index.js'})
    commitAll(root, 'defer the ./types/* removal to a changeset (declared as a patch)')

    // S22e — ADEQUATE PROJECTION credits the removal (the DS #164 fix). A pending changeset projects
    // 2.0.0 — a MAJOR that covers the removal — so the would-be break goes green, and the WHOLE run
    // returns exit 0 (asserted explicitly, as S22c does: `expect` alone is satisfied by any 0).
    result = await gate({build: false, changesetProbe: {kind: 'measured', bumps: new Map([['@toy/surface', '2.0.0']])}})
    expect('S22e an adequate projected MAJOR credits the removal', result, '@toy/surface', 'PENDING_PUBLISH', 0)
    check('S22e the credit turns the whole run green', result.exitCode === 0, `exitCode=${result.exitCode} — rows=${
      JSON.stringify(result.rows.map((r) => `${r.name}:${r.verdict}:${r.exitClass}`))
    }`)
    check('S22e the credited row still reports the removed subpath', (surfaceRow(result).removedSubpaths ?? []).includes('./types/*'),
      `removed=${JSON.stringify(surfaceRow(result).removedSubpaths)}`)

    // S22f — MANDATORY ADEQUACY. A projected 1.1.0 is a genuine forward move carrying a larger bump
    // than the declared patch (so it IS credited), but a MINOR still does not cover a removal needing
    // MAJOR: SURFACE_BREAK stands. The excuse never excuses an inadequate bump.
    result = await gate({build: false, changesetProbe: {kind: 'measured', bumps: new Map([['@toy/surface', '1.1.0']])}})
    expect('S22f an inadequate projected MINOR still SURFACE_BREAKs', result, '@toy/surface', 'SURFACE_BREAK', 2)

    // S22g — MEASURED-BUT-ABSENT falls back. The probe ran but @toy/surface is not in the computed
    // bump set (newVersion null), so there is no projection to credit and the removal breaks.
    result = await gate({build: false, changesetProbe: {kind: 'measured', bumps: new Map([['@toy/other', '9.9.9']])}})
    expect('S22g a measured-but-absent package gets no surface credit', result, '@toy/surface', 'SURFACE_BREAK', 2)

    // S22h — NOT-MEASURED falls back, and the `measured` kind gate is load-bearing: even a
    // not-measured probe that CARRIES a version grants no credit (only a `measured` kind is
    // authoritative — the version is ignored). SURFACE_BREAK stands.
    result = await gate({build: false, changesetProbe: {kind: 'not-measured', reason: 'no .changeset/config.json', newVersion: '2.0.0'}})
    expect('S22h a not-measured probe grants no surface credit', result, '@toy/surface', 'SURFACE_BREAK', 2)

    // S22i — CREDIT ONLY RAISES. A projection BEHIND the declared version (0.9.0 < 1.0.1) is
    // regression-shaped; bumpBetween would size it as a MAJOR (it is directionless), but
    // isStrictlyAhead refuses it, so the declared patch stands and the removal breaks. The excuse
    // can never launder a backward move.
    result = await gate({build: false, changesetProbe: {kind: 'measured', bumps: new Map([['@toy/surface', '0.9.0']])}})
    expect('S22i a backward projection is never credited', result, '@toy/surface', 'SURFACE_BREAK', 2)

    // S22j — INDETERMINATE probe falls back. An untrustworthy projection grants no surface credit.
    // (The ladder separately escalates a would-be DRIFT to INDETERMINATE upstream; here the surface
    // row is a PENDING_PUBLISH, so the probe only denies credit and the break stands.)
    result = await gate({build: false, changesetProbe: {kind: 'indeterminate', detail: 'simulated surface probe failure'}})
    expect('S22j an indeterminate probe grants no surface credit', result, '@toy/surface', 'SURFACE_BREAK', 2)

    fs.rmSync(surfaceDir, {recursive: true, force: true})
    commitAll(root, 'remove the surface fixture package')

    // ── S28 — LEVEL 2, ADVISORY (atlas decision 0028 PR 3). ──────────────────────────────────────
    //
    // THE BREAK CLASS LEVEL 1 CANNOT SEE, end to end: a NAMED export is removed while every
    // `exports` subpath stays byte-identical. `@j0nathan-ll0yd/validation` 1.1.0 -> 2.0.0 dropped 5
    // names and was caught only because it ALSO happened to major. S22b's shape does not reach it —
    // the subpath key set never moves here, so the entire Level-1 rule is silent by construction.
    //
    // AND THE EXIT CODE MUST NOT MOVE. That is the whole content of PR 3, and this rung is what
    // makes "advisory" testable rather than asserted: the declared 1.0.1 is a PATCH, which never
    // covers a MAJOR-requiring name removal, so an ENFORCING Level 2 would read SURFACE_BREAK /
    // exit 2 right here. It must read PENDING_PUBLISH / exit 0 with the finding in `advisories`.
    // Three mutants (`level2enforcing`, `level2silent`, `level2noextract`) each break exactly one
    // half of that sentence and are killed by this rung alone.
    const namedDir = path.join(root, 'packages', 'named')
    const setNamed = (version, declaration) => {
      writeJson(path.join(namedDir, 'package.json'), {
        name: '@toy/named',
        version,
        files: ['src'],
        exports: {'.': './src/index.d.ts'},
        publishConfig: {registry: registryUrl}
      })
      fs.writeFileSync(path.join(namedDir, 'src', 'index.d.ts'), declaration)
    }
    const namedRow = (evaluated) => row(evaluated, '@toy/named') ?? {}
    fs.mkdirSync(path.join(namedDir, 'src'), {recursive: true})
    setNamed('1.0.0', 'export declare const alpha: number\nexport declare const beta: string\n')
    commitAll(root, 'add a package whose surface is its NAMES, not its subpaths')
    registry.publish('@toy/named', '1.0.0', await packFixture(root, 'named'))

    result = await gate({build: false})
    expect('S28 an unchanged named surface is CLEAN', result, '@toy/named', 'CLEAN', 0)
    check('S28 an unchanged named surface is QUIET — no advisory churn', !(namedRow(result).advisories ?? []).some((advisory) =>
      advisory.startsWith('surface-')
    ), `advisories=${JSON.stringify(namedRow(result).advisories)}`)
    // Reporting continuity, NOT a detector — and the distinction is worth stating, because it is
    // tempting to read it as one. On a CLEAN package an engine that never extracted and one that
    // extracted and found no delta both report `level2: 'ok'`, so nothing asserted at this rung can
    // tell them apart. `level2noextract` is killed at S28b, where there is a real removal to miss.
    check('S28 the row records which rule and extractor produced its Level-2 comparison',
      namedRow(result).level2 === 'ok' && namedRow(result).extractSpecVersion === EXTRACT_SPEC_VERSION,
      `level2=${namedRow(result).level2} extractSpecVersion=${namedRow(result).extractSpecVersion}`)

    // S28b — THE REGRESSION: drop `beta`, keep every subpath, ship it as a PATCH.
    setNamed('1.0.1', 'export declare const alpha: number\n')
    commitAll(root, 'remove a named export under a patch, subpaths untouched')
    result = await gate({build: false})
    // ── THIS ASSERTION IS DELIBERATELY COMPOUND, AND IT MUST STAY FIRST. ─────────────────────────
    //
    // `stopAfter` unwinds the ladder at the FIRST assertion whose id matches the scenario, so under
    // a mutant run this is the ONLY S28b rung that executes — every check below it is baseline-only
    // detail. All three Level-2 mutants are therefore keyed to S28b and all three have to die right
    // here, which is exactly why it asserts both halves of the advisory contract at once:
    //
    //   REPORTED     `level2silent` empties the advisory list; `level2noextract` never produces the
    //                names to report. Both leave this list without its two entries.
    //   NOT ENFORCED `level2enforcing` feeds the names into the verdict call, turning this row into
    //                SURFACE_BREAK / exit 2.
    //
    // Splitting them into two readable rungs would silently disarm whichever ended up second —
    // MEASURED: with the advisory check placed second, `level2silent` and `level2noextract` both
    // SURVIVED a run that reported the mutation as expected-to-fail.
    check('S28b a removed NAME is REPORTED as an advisory and moves NO verdict',
      (namedRow(result).advisories ?? []).includes('surface-named-delta:.:removed:beta') &&
        (namedRow(result).advisories ?? []).includes('surface-named-break:major') &&
        namedRow(result).verdict === 'PENDING_PUBLISH' && namedRow(result).exitClass === 0 && result.exitCode === 0,
      `verdict=${namedRow(result).verdict} class=${namedRow(result).exitClass} exitCode=${result.exitCode} ` +
        `advisories=${JSON.stringify(namedRow(result).advisories)}`)
    check('S28b Level 1 is SILENT — no subpath moved, which is exactly why Level 2 exists',
      (namedRow(result).removedSubpaths ?? []).length === 0 && (namedRow(result).addedSubpaths ?? []).length === 0 &&
        namedRow(result).requiredBump === 'none', `removed=${JSON.stringify(namedRow(result).removedSubpaths)} required=${namedRow(result).requiredBump}`)
    check('S28b the advisory carries the structured name refs, not only the strings',
      JSON.stringify(namedRow(result).removedNames ?? []) === JSON.stringify([{subpath: '.', name: 'beta', kind: 'value'}]),
      `removedNames=${JSON.stringify(namedRow(result).removedNames)}`)
    expect('S28b a removed NAME does NOT move the verdict while Level 2 is advisory', result, '@toy/named', 'PENDING_PUBLISH', 0)
    // ...in EVERY lane. Asserted on the VERDICT, not the exit class, and the difference is real:
    // PENDING_PUBLISH is legitimately exit 2 in the post-publish lane (you declared a version and
    // never published it) — the LANE changes severity, as it always has. What Level 2 must not do
    // is change the verdict itself. `SURFACE_BREAK` here in any lane is the enforce-flip landing
    // early, and that is what this catches.
    for (const namedLane of LANES) {
      const laneResult = await gate({build: false, lane: namedLane})
      const laneRow = row(laneResult, '@toy/named') ?? {}
      check(`S28b Level 2 does not change the VERDICT in the ${namedLane} lane`,
        laneRow.verdict === 'PENDING_PUBLISH' && (laneRow.advisories ?? []).includes('surface-named-break:major'),
        `verdict=${laneRow.verdict} class=${laneRow.exitClass} advisories=${JSON.stringify(laneRow.advisories)}`)
    }

    fs.rmSync(namedDir, {recursive: true, force: true})
    commitAll(root, 'remove the named-surface fixture package')

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
    result = await gate({build: true}) // rewrites build.js → the build must run to hit the failing exit
    expect('S9 broken build is BUILD_FAILED', result, '@toy/leaf', 'BUILD_FAILED', 4)

    // S9b — a build that exits 0 but leaves a declared output empty.
    fs.writeFileSync(path.join(root, 'build.js'), 'require("fs").mkdirSync("dist", {recursive: true})\n')
    fs.rmSync(path.join(root, 'packages', 'leaf', 'dist'), {recursive: true, force: true})
    fs.rmSync(path.join(root, 'packages', 'dependent', 'dist'), {recursive: true, force: true})
    result = await gate({build: true}) // rewrites build.js + removes dist → the build must run to leave the output empty
    expect('S9b empty declared output is BUILD_FAILED', result, '@toy/leaf', 'BUILD_FAILED', 4)
    fs.writeFileSync(path.join(root, 'build.js'), BUILD_JS)

    // ── The PENDING_CHANGESET excuse (atlas decision 0022), end to end. ─────────────────────────
    //
    // A bare changeset is a promise to bump, not a bump: this gate measures package.json on disk, so
    // a PR carrying a good `.changeset/*.md` reads as DRIFT and the required check stays red — the
    // exact tax design-system PR #164 paid by running `changeset version` in-PR. The excuse relabels
    // a covered DRIFT to PENDING_CHANGESET (exit 0 on a branch), and ONLY when the projected version
    // is itself a clean PENDING_PUBLISH (mandatory adequacy). S23–S25 inject a synthetic probe (the
    // throwaway fixture has no `@changesets/*`); S26 stands up a real one.
    setVersion(root, 'leaf', '1.0.1')
    fs.writeFileSync(path.join(root, 'packages', 'leaf', 'src', 'index.js'), 'module.exports = 23\n')
    commitAll(root, 'drift leaf for the changeset excuse')

    // S23 — a covered drift. leaf drifts under its published 1.0.1, and a pending changeset would
    // move it to a clean, not-yet-published 1.0.2. Green on a branch with no in-PR `changeset version`.
    result = await gate({build: true, changesetProbe: {kind: 'measured', bumps: new Map([['@toy/leaf', '1.0.2']])}}) // edits leaf src → dist must be rebuilt for the covered drift to surface
    expect('S23 a covered drift is PENDING_CHANGESET', result, '@toy/leaf', 'PENDING_CHANGESET', 0)
    check('S23 the excuse names its projected target', (row(result, '@toy/leaf').advisories ?? []).includes('changeset-target:1.0.2'),
      `advisories=${JSON.stringify(row(result, '@toy/leaf').advisories)}`)

    // S23b — the lane changes SEVERITY, never a verdict (M7). A changeset still unapplied after the
    // release workflow ran is a stalled train: consumers resolve a stale tarball (the H2 window).
    result = await gate({lane: 'post-publish', changesetProbe: {kind: 'measured', bumps: new Map([['@toy/leaf', '1.0.2']])}})
    expect('S23b post-publish escalates PENDING_CHANGESET', result, '@toy/leaf', 'PENDING_CHANGESET', 2)
    check('S23b the lane never rewrites the verdict', row(result, '@toy/leaf').verdict === 'PENDING_CHANGESET' && row(result, '@toy/leaf').exitClass === 2,
      'lane leaked into the verdict field')

    // S24 — ADEQUACY IS MANDATORY. Publish 1.0.2, then a pending PATCH projects onto 1.0.2 — ALREADY
    // PUBLISHED. Excusing it would let `changeset publish` skip a resident version and exit 0 while
    // the drift never ships (the exact C147 failure), so it stays DRIFT with a `changeset-inadequate`
    // advisory. The excuse must never MANUFACTURE the failure it exists to excuse.
    registry.publish('@toy/leaf', '1.0.2', await packFixture(root, 'leaf'))
    result = await gate({changesetProbe: {kind: 'measured', bumps: new Map([['@toy/leaf', '1.0.2']])}})
    expect('S24 an inadequate changeset bump stays DRIFT', result, '@toy/leaf', 'DRIFT', 2)
    check('S24 stamps changeset-inadequate on the denied excuse',
      (row(result, '@toy/leaf').advisories ?? []).some((a) => a.startsWith('changeset-inadequate:')),
      `advisories=${JSON.stringify(row(result, '@toy/leaf').advisories)}`)

    // S25 — A2b at the seam introduced to enforce it: a probe that ran and could not answer softens a
    // would-be DRIFT to INDETERMINATE (exit 3), never a pass. The scoping is deliberate — only a
    // would-be DRIFT escalates; a CLEAN row proved clean stays clean regardless of the probe.
    result = await gate({changesetProbe: {kind: 'indeterminate', detail: 'simulated probe failure'}})
    expect('S25 an indeterminate probe softens a drift to INDETERMINATE', result, '@toy/leaf', 'INDETERMINATE', 3)
    check('S25 the row records the probe failure', (row(result, '@toy/leaf').advisories ?? []).some((a) => a.startsWith('changeset-probe-failed:')),
      `advisories=${JSON.stringify(row(result, '@toy/leaf').advisories)}`)

    // S26 — THE CASCADE CLOSURE, against the REAL probe. `@toy/csdep` is named in NO changeset;
    // `updateInternalDependencies: patch` bumps it anyway, and that bump is not derivable from the
    // changeset frontmatter. Bumping csleaf on disk rewrites csdep's `workspace:*` pin, drifting it
    // under its still-published 1.0.0 — the excuse must cover it, which it can only do because the
    // probe read the closure from `@changesets/get-release-plan` rather than from the `.md` files.
    const cascadeRoot = buildChangesetCascadeFixture(registryUrl)
    if (!runWorkspaceBuild(cascadeRoot).ok) {
      throw new Error('cascade fixture build failed')
    }
    registry.publish('@toy/csleaf', '1.0.0', await packFixture(cascadeRoot, 'csleaf'))
    registry.publish('@toy/csdep', '1.0.0', await packFixture(cascadeRoot, 'csdep'))
    setVersion(cascadeRoot, 'csleaf', '1.0.1')
    commitAll(cascadeRoot, 'bump csleaf on disk, drifting the dependent')
    result = await gate({repoRoot: cascadeRoot, build: false})
    expect('S26 the cascade closure excuses an unnamed dependent', result, '@toy/csdep', 'PENDING_CHANGESET', 0)
    check('S26 the excuse names the cascade target the probe supplied',
      (row(result, '@toy/csdep').advisories ?? []).some((a) => a.startsWith('changeset-target:')),
      `advisories=${JSON.stringify(row(result, '@toy/csdep').advisories)}`)
    fs.rmSync(cascadeRoot, {recursive: true, force: true})

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
  exitlaunder3: {scenario: 'S18', anchor: 'process.exitCode = code', replacement: 'process.exitCode = code === EXIT_INDETERMINATE ? EXIT_OK : code'},
  // ── The export-surface rule, pinned the same three ways (spec v2) ────────────────
  //
  // Compare the candidate surface against ITSELF instead of against the published
  // reference. Every delta is then empty, nothing ever requires a bump, and the rule is a
  // no-op that still prints, still reports fields and still looks wired in — the exact
  // shape of the `selfref` mutant one layer up, which is the mutation the PREVIOUS
  // generation of this gate could not see at all. Killed by S22b.
  // RE-ANCHORED FOR LEVEL 2 (decision 0028 PR 3), and the reason is itself the hazard this table
  // exists to catch: the old anchor `reference: reference.surface,` now matches the ADVISORY call
  // as well as the verdict one, so left alone it would have patched the half that moves no exit
  // code — a mutant that still applied cleanly, still reported, and could no longer be killed by
  // S22b. It SURVIVED, measured. The anchor now names the `level1View` pair explicitly, so it can
  // only ever target the verdict path, and the enforce-flip (PR 4) that deletes those calls will
  // break this anchor loudly rather than silently disarming it again.
  surfaceselfref: {
    scenario: 'S22b',
    anchor: 'reference: level1View(reference.surface),\n          candidate: level1View(candidateSurface),',
    replacement: 'reference: level1View(candidateSurface),\n          candidate: level1View(candidateSurface),'
  },
  // Turn "I could not read the public surface" back into a pass — A2b defeated one layer
  // below the digest. The row keeps whatever verdict the PAYLOAD comparison produced, so a
  // package whose exports map is unreadable sails through as CLEAN or PENDING_PUBLISH.
  // Killed by S22d.
  surfaceindetpass: {scenario: 'S22d', anchor: "verdict = 'INDETERMINATE'", replacement: 'verdict = decision.verdict'},
  // A bump sizer that always answers 'major'. THE SUBTLE ONE: the rule stays wired in, the
  // reference is still the published tarball, the reporting is still correct — and because
  // every declared bump now outranks every requirement, nothing can ever break. It is also
  // the shape a naive "read the major field" implementation degenerates into for 0.x
  // packages, which is why bumpBetween uses caret-range semantics. Killed by S22b.
  surfacealwaysmajor: {
    scenario: 'S22b',
    anchor: 'export function bumpBetween(from, to) {',
    replacement: "export function bumpBetween(from, to) {\n  return 'major'"
  },
  // ── Changeset-aware surface credit (atlas decision 0024, spec v2). Each mutant breaks exactly one
  // of the four safety invariants S22e–S22j pin; the vendored 61 vectors pin the same four at the
  // contract layer. ────────────────────────────────────────────────────────────────────────────────
  //
  // Never enter the credit block, so an adequate projection no longer excuses the removal — the DS
  // #164 fix would be a no-op. Killed by S22e, which expects the credited removal to go green.
  surfacechangesetnevercredits: {
    scenario: 'S22e',
    anchor: 'if (projectedBump !== null && isStrictlyAhead(pending.newVersion, declared) && bumpRank(projectedBump) > bumpRank(declaredBump)) {',
    replacement:
      'if (false && projectedBump !== null && isStrictlyAhead(pending.newVersion, declared) && bumpRank(projectedBump) > bumpRank(declaredBump)) {'
  },
  // Force every credited projection to the strongest bump, so an inadequate MINOR would excuse a
  // removal that needs a MAJOR — the excuse manufacturing the pass it must never grant. Killed by S22f.
  surfacechangesetalwaysexcuses: {scenario: 'S22f', anchor: 'sizingBump = projectedBump', replacement: "sizingBump = 'major'"},
  // Drop the `measured` kind gate, so a not-measured (or indeterminate) probe that happens to carry a
  // version would be credited — the fail-safe default defeated. Killed by S22h.
  // (The `normalizePendingRelease` prefix makes this anchor unique to evaluateSurface — the same
  // `measured && newVersion` guard also appears in decideVerdict's ladder excuse.)
  surfacechangesetnotmeasuredexcuses: {
    scenario: 'S22h',
    anchor: "const pending = normalizePendingRelease(pendingRelease)\n  if (pending.kind === 'measured' && pending.newVersion !== null) {",
    replacement: 'const pending = normalizePendingRelease(pendingRelease)\n  if (pending.newVersion !== null && pending.newVersion !== undefined) {'
  },
  // Drop the direction guard, so a backward, regression-shaped projection sizes to a large
  // directionless bumpBetween and launders the break. Killed by S22i.
  surfacechangesetignoresdirection: {
    scenario: 'S22i',
    anchor: 'isStrictlyAhead(pending.newVersion, declared) && bumpRank(projectedBump) > bumpRank(declaredBump)',
    replacement: 'bumpRank(projectedBump) > bumpRank(declaredBump)'
  },
  // ── LEVEL 2, ADVISORY (atlas decision 0028 PR 3). Three mutants, one rung (S24/S24b), and each
  // breaks a DIFFERENT half of "the rule is computed and reported, and no exit code moves". The
  // advisory phase is unusually easy to get wrong in a way nothing notices, because two of the
  // three failure modes are SILENT: a rule that stopped looking and a rule that looked and said
  // nothing both produce a green run that is indistinguishable from a correct one. ────────────────
  //
  // ADVISORY-ONLY IS THE WHOLE POINT OF PR 3. Feed the names into the VERDICT-sizing call and a
  // Level-2 delta starts moving this repo's exit codes while mantle is still on spec v2 — the
  // transient-desync window (0028 §4) turns from fail-SAFE into fail-BLOCKING, and every PR that
  // legitimately renames an internal export starts failing pre-push. Killed by S28b, which expects
  // a MAJOR-requiring name removal under a declared PATCH to stay PENDING_PUBLISH / exit 0.
  level2enforcing: {
    scenario: 'S28b',
    anchor: 'reference: level1View(reference.surface),\n          candidate: level1View(candidateSurface),',
    replacement: 'reference: reference.surface,\n          candidate: candidateSurface,'
  },
  // Compute the Level-2 delta and tell nobody. In the advisory phase the advisory IS the entire
  // observable output — there is no exit code to notice — so a silent rule is indistinguishable
  // from an absent one, and the enforce-flip (PR 4) would then be the FIRST time anyone saw the
  // findings, which is precisely the rollout advisory-first exists to avoid. Killed by S28b.
  level2silent: {
    scenario: 'S28b',
    anchor: '  return {advisories, level2: outcome.kind, removedNames, addedNames, level2Detail: null}',
    replacement: '  return {advisories: [], level2: outcome.kind, removedNames, addedNames, level2Detail: null}'
  },
  // Stop extracting names, so both sides are names-less and the rule silently degrades to Level 1
  // FOREVER. Nothing reds, nothing warns, and `surfaceDelta`'s two-names-less-sides branch is a
  // legitimate spec-v2 comparison — so this is the "it still passes, it just stopped looking"
  // failure, which is exactly how the estate arrived at needing this rule. Killed by S28b, not by
  // S28: a CLEAN rung cannot see this at all, because an engine that never looked and one that
  // looked and found nothing produce identical green rows. Only the rung with a real removal to
  // report can tell them apart.
  level2noextract: {
    scenario: 'S28b',
    anchor: '    return {...level1, names: extractSurfaceNames({files, manifestText}).names}',
    replacement: '    return level1'
  },
  // ── The PENDING_CHANGESET excuse (atlas decision 0022). A subset of mantle's ten mutants: the
  // guardrails whose defect this .mjs engine can express through a NAMED scenario. Mantle's
  // exit-mapping and OVERRIDABLE mutants are pinned by the shared verdict-conformance runner and the
  // SURFACE_APPLICABLE_VERDICTS set instead. ──────────────────────────────────────────────────────
  //
  // Moving the PENDING_CHANGESET literal to the DRIFT arm: a covered drift never gets its excuse.
  // Killed by S23.
  changesetblocking: {
    scenario: 'S23',
    anchor: "return {verdict: 'PENDING_CHANGESET', referenceVersion, advisories: [...advisories, `changeset-target:${pending.newVersion}`]}",
    replacement: "return {verdict: 'DRIFT', referenceVersion, advisories: [...advisories, `changeset-target:${pending.newVersion}`]}"
  },
  // Excusing the DRIFT fall-through unconditionally, which would grant PENDING_CHANGESET to a
  // not-measured probe (the LP/OMD path) — a bare changeset dir would excuse every drift. Killed by
  // S2, where the main fixture has no `.changeset/` and the real probe returns not-measured.
  changesetnotmeasuredexcuses: {
    scenario: 'S2',
    anchor: "return {verdict: 'DRIFT', referenceVersion, advisories}",
    replacement: "return {verdict: 'PENDING_CHANGESET', referenceVersion, advisories}"
  },
  // Softening an indeterminate probe back into whatever the ladder said instead of INDETERMINATE —
  // the A2b violation at the seam introduced to enforce it. Killed by S25.
  changesetindeterminatepasses: {
    scenario: 'S25',
    anchor: "return {verdict: 'INDETERMINATE', referenceVersion, advisories: [...advisories, `changeset-probe-failed:${pending.detail}`]}",
    replacement: 'advisories.push(`changeset-probe-failed:${pending.detail}`)'
  },
  // Dropping the mandatory adequacy test, so a patch that projects onto an already-published version
  // is excused — the excuse MANUFACTURING the C147 silent-skip it exists to prevent. Killed by S24.
  changesetalwaysexcuses: {scenario: 'S24', anchor: "if (projected.verdict === 'PENDING_PUBLISH') {", replacement: 'if (true) {'},
  // Filtering the release plan to `changesets.length > 0`, dropping the cascade closure a
  // frontmatter-only gate would also miss (design-system PR #164). Killed by S26, the ONLY rung that
  // runs the real `@changesets/get-release-plan` probe.
  probecascadedropped: {
    scenario: 'S26',
    anchor: "if (type !== 'none' && newVersion !== oldVersion) {",
    replacement: "if (type !== 'none' && newVersion !== oldVersion && Array.isArray(entry.changesets) && entry.changesets.length > 0) {"
  },
  // Disable the transport retry (four attempts -> one), so the first throttled 403 is final —
  // the regression that let a momentary GitHub Packages throttle stall the release train
  // (#158/#161). The node:test suite pins the retry, but the mutation ladder did not, so
  // deleting it would have left --self-test green. Killed by S27, where the leaf's first two
  // packument reads are throttled: with one attempt the 403 survives, leaf goes auth ->
  // INDETERMINATE, and S27's CLEAN assertion fails.
  retryoff: {scenario: 'S27', anchor: 'const REQUEST_ATTEMPTS = 4', replacement: 'const REQUEST_ATTEMPTS = 1'}
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
  fs.writeFileSync(file, absolutizeRelativeImports(patched))
  return file
}

/**
 * Rewrite this file's relative import specifiers to absolute file URLs before the mutant is written.
 *
 * The mutant lands in a TEMP directory so the patched text is loaded instead of the shipped module,
 * which means `./fixtures/extract.mjs` would otherwise resolve against `/var/folders/...` and throw
 * ERR_MODULE_NOT_FOUND. THAT THROW IS INDISTINGUISHABLE FROM "THE MUTANT WAS KILLED": every
 * scenario would fail for a reason that has nothing to do with the mutation, the suite would report
 * every mutant killed, and it would be testing nothing. That is the vacuous-pass class this whole
 * harness exists to prevent, so the rewrite is not a convenience.
 *
 * Applied to `from '...'` specifiers only, and only to those starting `./` or `../`; bare and
 * `node:` specifiers resolve fine from anywhere (the vendored extractor's own `import 'typescript'`
 * is resolved from ITS real directory, which is inside this repo, so it is unaffected).
 *
 * KNOWN AND ACCEPTED ASYMMETRY: `fixtures/extract.mjs` imports `fixtures/reference.mjs`, which
 * re-exports from the PRISTINE copy of this file — so a mutation to `readExportTargets`,
 * `CLASSIFICATIONS` or `SURFACE_SPEC_VERSION` would not reach the extractor's view of them. No
 * mutant in the table targets those three, and adding one that does would need this noted; the
 * extractor's own behaviour is pinned by the 39 vendored extract vectors, not by this harness.
 */
function absolutizeRelativeImports(source) {
  const engineDir = path.dirname(fileURLToPath(import.meta.url))
  return source.replaceAll(/(\bfrom\s*)(['"])(\.\.?\/[^'"]+)\2/g,
    (_match, prefix, quote, specifier) => `${prefix}${quote}${pathToFileURL(path.resolve(engineDir, specifier)).href}${quote}`)
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
  const selfScript = fileURLToPath(import.meta.url)
  // PERF: fan the mutant subprocesses across every available core, capped at the mutation count.
  // The old min(4, …) throttled 24 mutants to four lanes even on an 8+ core self-hosted runner;
  // now that a mutant no longer rebuilds the fixture on every rung (see the gate() helper's
  // build:false default), each mutant is I/O-light and higher parallelism scales cleanly.
  const concurrency = Math.min(ids.length, os.availableParallelism?.() ?? os.cpus().length)
  const results = new Array(ids.length)
  let index = 0

  async function worker() {
    while (index < ids.length) {
      const i = index++
      const id = ids[i]
      const {scenario} = MUTATIONS[id]
      const res = await new Promise((resolve) => {
        execFile(process.execPath, [selfScript, '--self-test', `--mutation=${id}`], {encoding: 'utf8', maxBuffer: 64 * 1024 * 1024},
          (error, stdout, stderr) => {
            resolve({status: error ? (typeof error.code === 'number' ? error.code : 1) : 0, stdout, stderr})
          })
      })
      results[i] = {id, scenario, res}
    }
  }

  await Promise.all(Array.from({length: concurrency}, () => worker()))

  for (const {id, scenario, res} of results) {
    const killed = res.status === 0
    if (killed) {
      const match = res.stdout?.match(/killed by (\d+) assertion\(s\)/)
      const detail = match ? `by ${match[1]} assertion(s)` : `at "${scenario}"`
      console.log(`  killed    ${id.padEnd(14)} ${detail}`)
    } else {
      console.error(`  SURVIVED  ${id.padEnd(14)} — expected "${scenario}" to fail`)
      if (res.stderr) {
        console.error(res.stderr)
      }
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
        surfaceSpecVersion: SURFACE_SPEC_VERSION,
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

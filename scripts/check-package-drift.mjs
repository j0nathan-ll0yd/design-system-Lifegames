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
 * A2b: NO STATE MEANS "could not tell, so pass". Registry unreachable, missing auth,
 * integrity mismatch and pack failure are all INDETERMINATE / exit 3 in every lane.
 *
 * Usage:
 *   node scripts/check-package-drift.mjs [--lane=branch|pre-push|post-publish]
 *                                        [--json] [--strict-maps] [--no-cache]
 *                                        [--no-build]
 *   node scripts/check-package-drift.mjs --self-test [--mutant=<id>]
 */

import {createHash} from 'node:crypto'
import {execFile, spawnSync} from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import zlib from 'node:zlib'

/**
 * Part of the reference-digest cache key and printed in --json. Bump this whenever
 * canonicalize(), the normalize rule, or the unresolvable-map rule changes, or stale
 * digests will silently produce wrong verdicts on developer machines while CI (with a
 * fresh node_modules) is correct. The conformance vectors assert it.
 */
export const SPEC_VERSION = 1

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
    if (typeflag !== '0' && typeflag !== ' ') {
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

/** Recursively sorts object keys. Arrays keep their order — order is meaning there. */
export function canonicalize(value) {
  if (Array.isArray(value)) {
    return value.map(canonicalize)
  }
  if (value && typeof value === 'object') {
    const out = {}
    for (const key of Object.keys(value).sort()) {
      out[key] = canonicalize(value[key])
    }
    return out
  }
  return value
}

/**
 * package.json is canonicalised and has its top-level `version` DELETED; every other
 * file is hashed as raw bytes.
 *
 * Nested workspace-dependency versions are deliberately KEPT — that is exactly what
 * catches the cascade (a sibling moving 1.0.0 -> 1.0.1 inside dependencies[]).
 * `version` is deleted so the head-vs-semverMax(R) comparison is meaningful; when the
 * declared version IS published the two versions match anyway, so the deletion is inert.
 */
export function normalizeEntry(entryPath, bytes, opts = {}) {
  if (entryPath !== 'package.json') {
    return bytes
  }
  const parsed = JSON.parse(bytes.toString('utf8'))
  if (!opts.keepVersion) {
    delete parsed.version
  }
  return Buffer.from(JSON.stringify(opts.skipCanonicalize ? parsed : canonicalize(parsed)))
}

/**
 * A `.map` whose every `sources[]` entry resolves OUTSIDE the packed file set is dead
 * weight for every consumer: the path it points at is present in no consumer's
 * node_modules, so the map cannot be resolved by any tool. A map-only difference
 * therefore cannot change what a consumer executes, typechecks against, or resolves.
 *
 * This inspects the payload and the map's own sources array. It is not a path
 * heuristic, and it cannot hide a real change: anything altering behaviour or types
 * also alters a .js/.mjs/.d.ts entry.
 */
export function unresolvableMaps(files) {
  const dead = new Set()
  for (const [entryPath, bytes] of files) {
    if (!entryPath.endsWith('.map')) {
      continue
    }
    let sources
    try {
      sources = JSON.parse(bytes.toString('utf8')).sources
    } catch {
      continue
    }
    if (!Array.isArray(sources) || sources.length === 0) {
      continue
    }
    const dir = path.posix.dirname(entryPath)
    const allOutside = sources.every((src) => {
      if (typeof src !== 'string') {
        return false
      }
      const resolved = path.posix.normalize(path.posix.join(dir === '.' ? '' : dir, src))
      return !files.has(resolved)
    })
    if (allOutside) {
      dead.add(entryPath)
    }
  }
  return dead
}

/** Per-file normalized digests — the input to both the payload digest and the diff. */
export function fileDigests(files, exclude = new Set(), opts = {}) {
  const out = {}
  for (const [entryPath, bytes] of files) {
    if (exclude.has(entryPath)) {
      continue
    }
    out[entryPath] = sha256(normalizeEntry(entryPath, bytes, opts))
  }
  return out
}

export function digestOf(perFile) {
  const manifest = Object.keys(perFile).map((p) => `${p} ${perFile[p]}`).sort().join('\n')
  return sha256(manifest)
}

export function payloadDigest(files, exclude = new Set(), opts = {}) {
  return digestOf(fileDigests(files, exclude, opts))
}

export function differingFiles(headPerFile, refPerFile) {
  const names = new Set([...Object.keys(headPerFile), ...Object.keys(refPerFile)])
  return [...names].filter((n) => headPerFile[n] !== refPerFile[n]).sort()
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
// Step 0 — Discovery (no globbing, no history)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `pnpm list -r --depth -1 --json` is the authoritative workspace enumeration. The
 * hand-rolled `packages/*` scan and the pnpm-workspace.yaml glob walker both die here,
 * and with them the divergence risk of three separate glob engines.
 *
 * M6 (inventory discovered from the working tree while evaluating another ref) is fixed
 * BY CONSTRUCTION: there is exactly one tree now. Discovery, build and pack all read
 * `repoRoot`. `--head` / `--base` no longer exist — evaluating an arbitrary ref is not
 * meaningful when the payload requires a build and a build requires a materialised tree.
 */
export function discoverWorkspace(repoRoot) {
  const result = spawnSync('pnpm', ['list', '-r', '--depth', '-1', '--json'], {cwd: repoRoot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024})
  if (result.error) {
    throw new Error(`pnpm list failed to run (${result.error.code ?? result.error.message})`)
  }
  if (result.status !== 0) {
    throw new Error(`pnpm list exited ${result.status}: ${(result.stderr || '').trim()}`)
  }
  return JSON.parse(result.stdout)
}

export function classifyMember(member, {registry, scope}) {
  if (member.private === true) {
    return {publishable: false, reason: 'private: true'}
  }
  if (!member.name) {
    return {publishable: false, reason: 'no name'}
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

export async function fetchPackument(registry, name, token) {
  const url = `${registry.replace(/\/$/, '')}/${encodeURIComponent(name)}`
  let response
  try {
    response = await fetch(url, {headers: {Authorization: `Bearer ${token}`, Accept: 'application/vnd.npm.install-v1+json', 'Cache-Control': 'no-cache'}})
  } catch (err) {
    const code = err?.cause?.code ?? err?.code ?? 'FETCH_FAILED'
    return {kind: 'unreachable', detail: `${code} fetching ${url}`}
  }
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
  let response
  try {
    response = await fetch(url, {headers: {Authorization: `Bearer ${token}`}})
  } catch (err) {
    const code = err?.cause?.code ?? err?.code ?? 'FETCH_FAILED'
    return {kind: 'unreachable', detail: `${code} fetching ${url}`}
  }
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

export function runWorkspaceBuild(repoRoot) {
  const rootManifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'))
  // Use the REPO'S OWN build. Never per-package: turbo's dependsOn: ["^build"] graph
  // already orders it, and N separate invocations serialise the dependency chain.
  const args = rootManifest.scripts?.build ? ['run', 'build'] : ['-r', 'run', 'build']
  const result = spawnSync('pnpm', args, {cwd: repoRoot, stdio: 'inherit'})
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
 * DRIFT forever. The `npmpack` mutant pins this.
 */
function packOne(pkg, destDir, {useNpm = false} = {}) {
  fs.mkdirSync(destDir, {recursive: true})
  const cmd = useNpm ? 'npm' : 'pnpm'
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
    return parsed.specVersion === SPEC_VERSION ? parsed : null
  } catch {
    return null
  }
}

function writeCache(repoRoot, name, version, payload) {
  try {
    const file = cacheFile(repoRoot, name, version)
    fs.mkdirSync(path.dirname(file), {recursive: true})
    fs.writeFileSync(file, JSON.stringify({specVersion: SPEC_VERSION, name, version, ...payload}))
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
  concurrency = 8,
  mutant = null,
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
  let members
  try {
    members = discoverWorkspace(repoRoot)
  } catch (err) {
    return {rows: [], lane, fatal: `discovery failed: ${err.message}`, exitCode: EXIT_INDETERMINATE}
  }

  const publishable = []
  for (const member of members) {
    const classification = classifyMember(member, {registry, scope})
    if (classification.publishable) {
      publishable.push(member)
    } else {
      // A complete census, not a filtered list: a package must never silently fall out
      // of scope because someone flipped `private` or edited publishConfig.
      push({
        name: member.name ?? path.basename(member.path),
        path: member.path,
        declared: member.version ?? null,
        referenceVersion: null,
        verdict: 'SKIPPED',
        reason: classification.reason,
        advisories: [],
        differingFiles: [],
        leakedPaths: []
      })
    }
  }

  if (publishable.length === 0) {
    return {rows, lane, empty: true, exitCode: EXIT_OK}
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
      return {rows, lane, exitCode: computeExit(rows)}
    }
  }
  log(`auth: ${authSource}`)

  // ── Step 2 — packuments, in parallel, ALWAYS over the wire ────────────────
  const packuments = new Map()
  await Promise.all(publishable.map(async (member) => {
    let result = await fetchPackument(registry, member.name, authToken)
    if (mutant === 'swallow' && (result.kind === 'unreachable' || result.kind === 'auth')) {
      // MUTANT: pretend an unreachable registry means "nothing published, so fine".
      result = {kind: 'ok', versions: {}}
    }
    packuments.set(member.name, result)
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
    return {rows, lane, exitCode: computeExit(rows)}
  }

  // ── Step 3 — build once, whole workspace ──────────────────────────────────
  if (build) {
    log('building workspace...')
    const built = runWorkspaceBuild(repoRoot)
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
      return {rows, lane, exitCode: computeExit(rows)}
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
    return {rows, lane, exitCode: computeExit(rows)}
  }

  // ── Step 4 — pack the local side ──────────────────────────────────────────
  const packRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pkg-drift-pack-'))
  try {
    const packed = await mapWithConcurrency(ready, concurrency, async (entry, index) => {
      const result = await packOne(entry.member, path.join(packRoot, String(index)), {useNpm: mutant === 'npmpack'})
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
      if (mutant !== 'noleak') {
        try {
          leaked = leakScreen([...headFiles.keys()], {tracked: gitTrackedFiles(repoRoot, member.path), outputs})
        } catch (err) {
          indeterminate(member, `leak screen could not read git: ${err.message}`)
          continue
        }
      }
      const leakedSet = new Set(leaked)

      const digestOpts = {skipCanonicalize: mutant === 'nocanon', keepVersion: mutant === 'versionkept'}
      const headDeadMaps = strictMaps ? new Set() : unresolvableMaps(headFiles)
      const headStrictPerFile = fileDigests(headFiles, leakedSet, digestOpts)
      const headEffectivePerFile = fileDigests(headFiles, new Set([...leakedSet, ...headDeadMaps]), digestOpts)
      const strictDigest = digestOf(headStrictPerFile)
      const effectiveDigest = digestOf(headEffectivePerFile)

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
              const refDeadMaps = strictMaps ? new Set() : unresolvableMaps(refFiles)
              reference = {
                version: referenceVersion,
                strictPerFile: fileDigests(refFiles, new Set(), digestOpts),
                effectivePerFile: fileDigests(refFiles, refDeadMaps, digestOpts)
              }
              // Only the immutable published payload is cached; the packument never is,
              // so registry reachability is re-proven on every single run.
              if (useCache && !mutant) {
                writeCache(repoRoot, member.name, referenceVersion, {strictPerFile: reference.strictPerFile, effectivePerFile: reference.effectivePerFile})
              }
            }
          }
        }
      }
      if (referenceFailed) {
        continue
      }

      if (mutant === 'selfref' && reference) {
        // MUTANT: short-circuit the reference to the local payload. This is the direct
        // analogue of the `<head> <head>` two-point-diff mutation that made the previous
        // generation report "17 clean" on a tree with two real drifts while its
        // --self-test printed "self-test passed" and its unit suite went 51/51 green.
        reference = {version: reference.version, strictPerFile: headStrictPerFile, effectivePerFile: headEffectivePerFile}
      }

      const useStrict = strictMaps || mutant === 'rawbytes'
      const headCompare = useStrict ? headStrictPerFile : headEffectivePerFile
      const refCompare = reference ? (useStrict ? reference.strictPerFile : reference.effectivePerFile) : null

      // MUTANT `rawbytes`: compare the raw tarball bytes instead of the canonical
      // digest. Pinned by measurement — three consecutive packs of one unedited tree
      // gave three different tarball hashes and one identical canonical digest.
      const refDigest = mutant === 'rawbytes'
        ? (reference ? `raw:${reference.version}` : null)
        : refCompare
        ? digestOf(refCompare)
        : null
      const headDigest = mutant === 'rawbytes' ? `raw:${sha256(bytes)}` : useStrict ? strictDigest : effectiveDigest

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
        differingFiles: refCompare ? differingFiles(headCompare, refCompare) : [],
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

  return {rows, lane, exitCode: computeExit(rows)}
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

  if (result.empty) {
    console.log('this repo publishes no packages')
  }

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

  const counts = {}
  for (const row of evaluated) {
    counts[row.verdict] = (counts[row.verdict] ?? 0) + 1
  }
  const summary = Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', ') || 'nothing evaluated'
  console.log(`\n  ${evaluated.length} publishable package(s): ${summary}`)
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

async function packFixture(root, pkgDir) {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'pkg-drift-seed-'))
  const result = await packOne({path: path.join(root, 'packages', pkgDir)}, dest)
  if (!result.ok) {
    throw new Error(`fixture pack failed: ${result.detail}`)
  }
  const bytes = fs.readFileSync(result.tarball)
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
 * `stopAfter` unwinds the ladder as soon as the named scenario has been evaluated. It
 * exists only so a mutant run costs the rungs up to its target rather than all of them;
 * the BASELINE run never sets it, so every scenario is always exercised.
 */
async function runSelfTest({mutant = null, verbose = true, stopAfter = null} = {}) {
  const registry = startToyRegistry()
  const registryUrl = await registry.listen()
  const root = buildFixture(registryUrl)
  const failures = []
  const say = (line) => {
    if (verbose) {
      console.log(line)
    }
  }

  const gate = (overrides = {}) =>
    runGate({repoRoot: root, registry: registryUrl, scope: '@toy', token: 'selftest-token', useCache: false, concurrency: 2, mutant, ...overrides})

  const check = (id, ok, detail) => {
    if (ok) {
      say(`  ok    ${id}`)
    } else {
      say(`  FAIL  ${id} — ${detail}`)
      failures.push(`${id} — ${detail}`)
    }
    if (stopAfter && id.startsWith(stopAfter)) {
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
      ? `${found.verdict}/class=${found.exitClass}/process=${result.exitCode}`
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

    // S2 — payload change, NO bump. THE headline case.
    fs.writeFileSync(path.join(root, 'packages', 'leaf', 'src', 'index.js'), 'module.exports = 11\n')
    commitAll(root, 'edit leaf')
    result = await gate()
    expect('S2 payload change with no bump', result, '@toy/leaf', 'DRIFT', 2)
    check('S2 names the differing payload path', (row(result, '@toy/leaf').differingFiles ?? []).includes('dist/index.js'),
      `differingFiles=${JSON.stringify(row(result, '@toy/leaf').differingFiles)}`)

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
  }

  return failures
}

/**
 * mutant id -> the scenario id prefix it MUST break. Every one of these is a mutation
 * of the SHIPPED evaluator, not of a test double; if a mutant survives, the suite
 * cannot see a defect of that class and --self-test fails.
 */
const MUTANTS = {
  // The direct analogue of the `<head> <head>` mutation that the previous generation
  // could not see: short-circuit the reference to the local payload.
  selfref: 'S2',
  // Compare raw tarball bytes instead of the canonical digest.
  rawbytes: 'S1 clean baseline (leaf)',
  // Use `npm pack`, which never rewrites workspace:* .
  npmpack: 'S1 clean baseline (dependent)',
  // Map a registry fetch() failure to "nothing published, so fine".
  swallow: 'S0',
  // Skip the recursive key sort in canonicalize().
  nocanon: 'S1b',
  // Skip the leak screen.
  noleak: 'S8 gitignored',
  // Retain `version` in the canonical manifest.
  versionkept: 'S6'
}

async function selfTestCommand({mutant}) {
  if (mutant) {
    if (!(mutant in MUTANTS)) {
      console.error(`unknown mutant ${mutant}; known: ${Object.keys(MUTANTS).join(', ')}`)
      return 1
    }
    console.log(`\nself-test with mutant=${mutant} (expected to FAIL at "${MUTANTS[mutant]}")\n`)
    const failures = await runSelfTest({mutant, stopAfter: MUTANTS[mutant]})
    const relevant = failures.filter((f) => f.startsWith(MUTANTS[mutant]))
    if (relevant.length === 0) {
      console.error(`\nMUTANT ${mutant} SURVIVED — the suite cannot detect it. That is a build failure.\n`)
      return 1
    }
    console.log(`\nmutant ${mutant} killed by ${relevant.length} assertion(s) at ${MUTANTS[mutant]}*.\n`)
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
  console.log('\nbaseline green. Now proving the suite CAN fail (A2b) — 7 mutants:\n')

  let survivors = 0
  for (const [id, scenario] of Object.entries(MUTANTS)) {
    const failures = await runSelfTest({mutant: id, verbose: false, stopAfter: scenario})
    const killed = failures.find((f) => f.startsWith(scenario)) ?? null
    if (killed) {
      console.log(`  killed    ${id.padEnd(12)} by ${killed.split(' — ')[0]}`)
    } else {
      console.error(`  SURVIVED  ${id.padEnd(12)} — expected "${scenario}" to fail`)
      survivors += 1
    }
  }
  if (survivors > 0) {
    console.error(`\nself-test FAILED: ${survivors} mutant(s) survived.\n`)
    return 1
  }
  console.log(`\nself-test passed: baseline green, all 7 mutants killed (${((Date.now() - started) / 1000).toFixed(1)}s).\n`)
  return 0
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI
// ─────────────────────────────────────────────────────────────────────────────

export function parseArgs(argv) {
  const opts = {lane: 'branch', json: false, strictMaps: false, useCache: true, build: true, selfTest: false, mutant: null, help: false}
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
    } else if (arg.startsWith('--mutant=')) {
      opts.mutant = arg.slice('--mutant='.length)
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

  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const result = await runGate({
    repoRoot,
    lane: opts.lane,
    strictMaps: opts.strictMaps,
    useCache: opts.useCache,
    build: opts.build,
    log: opts.json ? () => {} : (line) => console.log(`[drift] ${line}`)
  })
  if (opts.json) {
    console.log(JSON.stringify({specVersion: SPEC_VERSION, lane: result.lane, exitCode: result.exitCode, rows: result.rows}, null, 2))
  } else {
    report(result)
  }
  return result.exitCode
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
if (invokedDirectly) {
  main(process.argv.slice(2)).then((code) => {
    process.exitCode = code
  })
}

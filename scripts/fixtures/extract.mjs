/**
 * Normative named-export extractor for export-surface Level 2. It is separate from the
 * dependency-free rule because extraction alone requires TypeScript, and it carries an
 * independent spec version so rule and extractor caches can evolve separately.
 *
 * Accepted TypeScript versions form a closed, fixture-verified set, never a range. The runtime
 * assertion prevents an unmeasured compiler from poisoning a cache under a trusted key.
 */

import defaultTs from 'typescript'

import {CLASSIFICATIONS, readExportTargets, SURFACE_SPEC_VERSION} from './reference.mjs'

/**
 * SAME NUMBER <=> IDENTICAL `{classification, names}` FOR EVERY FILE TREE.
 *
 * Bump if and only if extraction output changes for ANY input: the target resolution, the
 * classifier, the enumeration, the kind mapping, the sort, or the accepted `typescript` versions. Do
 * NOT bump for the rule (that is `SURFACE_SPEC_VERSION`), reporting or plumbing. A bump is atomic
 * across the estate: regenerate `export-extract-conformance.json` + its sidecar and move every
 * vendored copy in the same change. `runner.mjs` asserts
 * `EXTRACT_SPEC_VERSION === fixture.extractSpecVersion` as case zero.
 *
 * VERSION 2 (decision 0030) widened the compiler guard from one exact version to a measured set.
 * That IS an output change under this rule's own terms — an input that previously threw (a 6.0.3
 * compiler) now extracts — so the number moved even though no name, kind or classification did.
 */
export const EXTRACT_SPEC_VERSION = 2

/**
 * The `typescript` versions this contract has been MEASURED equivalent across (decision 0030).
 *
 * A CLOSED ENUMERATION — never a range, never a semver check. Membership here is not "this ought to
 * work"; it is "someone ran `decisions/evidence/0030-ts-version-set/` against the whole published
 * corpus and the output was byte-identical". Widening it without re-running that evaluation is the
 * one way this contract can rot silently, so two mutants guard it: widening the array must fail
 * conformance (the runner compares this against the PINNED FIXTURE's list, not against itself), and
 * deleting the membership test must fail the runtime probe.
 *
 * Each repo still pins `typescript` EXACTLY in its own `package.json` — to a member of this list.
 * The set is what the CONTRACT accepts; an unpinned range in a repo is still forbidden.
 */
export const VERIFIED_TS_VERSIONS = Object.freeze(['5.9.2', '5.9.3', '6.0.3'])

/**
 * Targets that carry a type surface a compiler can enumerate. `.js`/`.mjs`/`.cjs` are included
 * deliberately: a package may publish plain JS behind a subpath with no `types` condition, and its
 * named exports are still the contract consumers import. `allowJs` makes them enumerable.
 */
export const CODE_EXTENSIONS = Object.freeze(['.d.ts', '.d.mts', '.d.cts', '.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'])

/**
 * Targets with NO type surface BY DESIGN — determinable, not unknown (the A2b distinction).
 *
 * 121 of the estate's 253 expanded subpaths resolve to one of these (probe, decision 0020). A naive
 * extractor scores them "0 exports, clean", which is a meaningless green over 48% of the estate;
 * treating them as INDETERMINATE instead would block 5 of 24 packages permanently. They are neither
 * — they are `NO_SURFACE`, and `NO_SURFACE` is only ever compared against `NO_SURFACE`.
 *
 * The list is CLOSED, and an extension not on it (and not code, and not an SFC) is INDETERMINATE
 * rather than assumed inert. Guessing "probably an asset" is the inference this rule refuses.
 */
export const ASSET_EXTENSIONS = Object.freeze([
  '.css',
  '.scss',
  '.sass',
  '.less',
  '.json',
  '.jsonc',
  '.json5',
  '.md',
  '.mdx',
  '.txt',
  '.html',
  '.xml',
  '.yml',
  '.yaml',
  '.svg',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.avif',
  '.ico',
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
  '.eot',
  '.map',
  '.wasm'
])

/**
 * Single-file components. A TypeScript parse of `.astro` frontmatter returns ZERO exports while the
 * component genuinely exports an implicit `default` — a SILENTLY WRONG answer, which is worse than
 * an error. 28 of the estate's 253 subpaths are `.astro`. The synthetic `{default}` is the honest
 * answer the convention already gives us; `@astrojs/compiler` is deferred until a component ever
 * exports a NAMED value (decision 0028, axis B).
 */
export const SFC_EXTENSIONS = Object.freeze(['.astro'])

/** The implicit export every `.astro` component publishes. */
export const SFC_SYNTHETIC_NAMES = Object.freeze([Object.freeze({name: 'default', kind: 'value'})])

/**
 * Export conditions consulted to resolve a subpath to ONE target, in precedence order.
 *
 * `types` first, because that IS the type surface when a package declares one. `default` last,
 * because it is the fallback Node itself treats as the fallback. A condition whose value is an
 * object is resolved recursively with the same order, so nested condition maps need no special case.
 */
export const CONDITION_ORDER = Object.freeze(['types', 'typings', 'import', 'module', 'require', 'node', 'default', 'browser'])

/** The condition keys that DECLARE a type surface. Their presence changes the classification. */
export const TYPES_CONDITIONS = Object.freeze(['types', 'typings'])

const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * Order by UNICODE CODEPOINT, never `localeCompare`.
 *
 * A locale-sensitive sort makes the name set — and therefore any digest taken over it, and
 * therefore a verdict — depend on the ICU locale of whichever machine ran the gate. `'a'` sorts
 * BEFORE `'B'` under `en-US` and AFTER it by codepoint, so two engines could report different name
 * ORDERS for the same tree and a diff-based reader would see a change that is not there. JavaScript's
 * `<` compares UTF-16 CODE UNITS, which also diverges from codepoint order above the BMP, so this
 * walks codepoints explicitly rather than relying on `<`.
 */
export function compareCodepoints(left, right) {
  const a = [...String(left)]
  const b = [...String(right)]
  const shared = Math.min(a.length, b.length)
  for (let i = 0; i < shared; i++) {
    const x = a[i].codePointAt(0)
    const y = b[i].codePointAt(0)
    if (x !== y) {
      return x < y ? -1 : 1
    }
  }
  return a.length === b.length ? 0 : a.length < b.length ? -1 : 1
}

/** Total order over `{name, kind}` records: by name, then by kind. Deterministic, locale-free. */
export function compareNameRecords(left, right) {
  const byName = compareCodepoints(left.name, right.name)
  return byName !== 0 ? byName : compareCodepoints(left.kind, right.kind)
}

/**
 * Sort + dedupe a name set into the canonical form the rule compares.
 *
 * The key separator is U+0000, written as the ESCAPE `\u0000` and never as a raw byte. A literal
 * NUL in the source makes `file(1)` classify this module as binary DATA and makes grep SKIP IT
 * SILENTLY — a `grep expandWildcard extract.mjs` on a file containing the symbol returns nothing
 * (finding X9, and `pkg-drift.mjs`'s SPEC_FINGERPRINT carries the same warning). That is not
 * cosmetic here: the decision-0028 blast-radius sweep is a cross-repo `git grep` over the
 * shape-changed symbols, and this is one of the files whose shape changed, so a raw NUL would make
 * the sweep silently miss the very file it exists to find. Do not paste a raw control character
 * back in.
 *
 * A separator is needed at all — rather than a space — because an export name is not always an
 * identifier: `export {x as "hello world"}` is legal, so a space could collide two distinct pairs.
 */
export function canonicalNames(records) {
  const seen = new Map()
  for (const record of records) {
    const key = `${record.name}\u0000${record.kind}`
    if (!seen.has(key)) {
      seen.set(key, {name: record.name, kind: record.kind})
    }
  }
  return [...seen.values()].sort(compareNameRecords)
}

/**
 * The extension of a target path, lowercased, honouring the compound `.d.ts` forms.
 *
 * A LEADING DOT IS NOT AN EXTENSION SEPARATOR: `swift/.gitkeep` has extension `''`, not
 * `'.gitkeep'`. MEASURED — `@j0nathan-ll0yd/schemas` publishes `"./swift/*": "./swift/*"`, and the
 * glob matches a `.gitkeep` placeholder. Both spellings classify the same way (INDETERMINATE, since
 * neither is code, asset nor component), so the verdict is unaffected either way; the difference is
 * that the REASON printed to a human said `extension ".gitkeep"`, which sends them looking for a
 * `.gitkeep` handler that should not exist. The honest message is "no extension".
 */
export function extensionOf(target) {
  const path = String(target ?? '').split('?')[0].split('#')[0].toLowerCase()
  for (const compound of ['.d.ts', '.d.mts', '.d.cts']) {
    if (path.endsWith(compound)) {
      return compound
    }
  }
  const slash = path.lastIndexOf('/')
  const basename = path.slice(slash + 1)
  const dot = basename.lastIndexOf('.')
  return dot <= 0 ? '' : basename.slice(dot)
}

/**
 * Resolve one `exports` entry value to a single target string.
 *
 * Total: every shape Node accepts has an answer, and anything else returns `null` WITH A REASON
 * rather than a guess. `null` for a `null` value is the deliberate "this subpath is blocked" case —
 * a real, determinable state, not a failure.
 *
 * @returns {{target: string|null, typed: boolean, detail: string|null}} `typed` is true when the
 *   value declared a `types`/`typings` condition (whether or not that condition won).
 */
export function resolveTarget(value, {seen = 0} = {}) {
  if (seen > 16) {
    return {target: null, typed: false, detail: 'the exports entry nests conditions more than 16 deep'}
  }
  if (value === null) {
    return {target: null, typed: false, detail: 'blocked'}
  }
  if (typeof value === 'string') {
    return {target: value, typed: false, detail: null}
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const resolved = resolveTarget(item, {seen: seen + 1})
      if (resolved.target !== null) {
        return resolved
      }
    }
    return {target: null, typed: false, detail: 'no entry in the target array resolves to a path'}
  }
  if (!isRecord(value)) {
    return {target: null, typed: false, detail: `an exports target may not be a ${typeof value}`}
  }
  const typed = TYPES_CONDITIONS.some((condition) => condition in value)
  for (const condition of CONDITION_ORDER) {
    if (!(condition in value)) {
      continue
    }
    const resolved = resolveTarget(value[condition], {seen: seen + 1})
    if (resolved.target !== null) {
      return {target: resolved.target, typed: typed || resolved.typed, detail: null}
    }
    if (resolved.detail === 'blocked') {
      return {target: null, typed, detail: 'blocked'}
    }
  }
  const keys = Object.keys(value)
  return {
    target: null,
    typed,
    detail: keys.length === 0 ? 'the exports target is an empty condition object' : `no known condition among ${keys.join(', ')} resolves to a path`
  }
}

/** Normalize a target/tarball path to the package-relative POSIX form the file map is keyed by. */
export function normalizeRel(path) {
  const trimmed = String(path ?? '').replace(/^\.\//, '').replace(/^\//, '')
  const parts = []
  for (const segment of trimmed.split('/')) {
    if (segment === '' || segment === '.') {
      continue
    }
    if (segment === '..') {
      parts.pop()
      continue
    }
    parts.push(segment)
  }
  return parts.join('/')
}

/**
 * Expands wildcard export keys against packed files. Only a starred key activates substitution;
 * a star in the target alone is literal in Node. Multi-star targets are indeterminate because
 * reverse capture is ambiguous; single-star targets must round-trip.
 *
 * @returns {{ok: true, entries: Array<{subpath: string, target: string}>} | {ok: false, detail: string}}
 */
export function expandWildcard(subpath, target, filePaths) {
  // Normalize the WHOLE target before splitting at the star. Normalizing only the prefix eats its
  // trailing slash (`./types/` -> `types`), so the capture picks up a leading `/` and the expanded
  // key comes out as `./types//a`.
  const normalized = normalizeRel(target)
  const stars = normalized.split('*').length - 1
  if (stars === 0) {
    return {ok: true, entries: []}
  }
  if (stars > 1) {
    return {
      ok: false,
      detail:
        `the pattern target ${target} contains ${stars} "*"; Node substitutes the capture into every one of them, which cannot be reversed from a file path unambiguously`
    }
  }
  const star = normalized.indexOf('*')
  const prefix = normalized.slice(0, star)
  const suffix = normalized.slice(star + 1)
  const entries = []
  for (const path of filePaths) {
    if (!path.startsWith(prefix) || !path.endsWith(suffix) || path.length < prefix.length + suffix.length) {
      continue
    }
    const captured = path.slice(prefix.length, path.length - suffix.length)
    entries.push({subpath: subpath.replace('*', captured), target: `./${path}`})
  }
  return {ok: true, entries: entries.sort((left, right) => compareCodepoints(left.subpath, right.subpath))}
}

/**
 * Classify ONE resolved target. The three-way distinction IS A2b in both directions, and every
 * branch is total — there is no silent default.
 *
 *   TYPED         a code target that is present         -> enumerate its names
 *   SFC_ENTRY     a `.astro` target that is present     -> the synthetic {default}
 *   NO_SURFACE    an asset, or a blocked subpath        -> compared only against NO_SURFACE
 *   INDETERMINATE anything I could not read or classify -> exit 3, never a pass
 *
 * A DECLARED-BUT-ABSENT target is INDETERMINATE, never NO_SURFACE. That is the whole rule in one
 * line: `@j0nathan-ll0yd/tokens@2.0.0` declares `.` -> `./dist/tokens.d.ts` and ships neither file,
 * and the correct answer is "I cannot tell you this package's surface", not "it has none".
 */
export function classifyTarget({target, typed, detail, has}) {
  if (target === null) {
    if (detail === 'blocked') {
      return {classification: CLASSIFICATIONS.NO_SURFACE, rel: null, detail: 'the subpath is blocked by a null target'}
    }
    return {classification: CLASSIFICATIONS.INDETERMINATE, rel: null, detail: detail ?? 'the exports entry resolves to no target'}
  }
  const rel = normalizeRel(target)
  const extension = extensionOf(rel)
  if (SFC_EXTENSIONS.includes(extension)) {
    return has(rel)
      ? {classification: CLASSIFICATIONS.SFC_ENTRY, rel, detail: null}
      : {classification: CLASSIFICATIONS.INDETERMINATE, rel, detail: `the single-file component ${rel} is declared but absent from the payload`}
  }
  if (ASSET_EXTENSIONS.includes(extension)) {
    // An asset is out of scope for type tooling whether or not it shipped: a missing `.css` is a
    // packaging defect the payload digest already catches, and it cannot change a TYPE surface.
    // But a `types` condition pointing AT an asset is a contradiction, not an asset.
    return typed
      ? {classification: CLASSIFICATIONS.INDETERMINATE, rel, detail: `a "types" condition resolves to ${rel}, which carries no type surface`}
      : {classification: CLASSIFICATIONS.NO_SURFACE, rel, detail: `${rel} is an asset (${extension}), out of scope for type tooling`}
  }
  if (!CODE_EXTENSIONS.includes(extension)) {
    return {
      classification: CLASSIFICATIONS.INDETERMINATE,
      rel,
      detail: `${rel} has extension "${extension || '(none)'}", which is neither a known code, asset nor component target`
    }
  }
  if (!has(rel)) {
    return {classification: CLASSIFICATIONS.INDETERMINATE, rel, detail: `${rel} is declared as an export target but is absent from the payload`}
  }
  return {classification: CLASSIFICATIONS.TYPED, rel, detail: null}
}

/**
 * THE RUNTIME COMPILER GUARD (decision 0028 §2.5, finding N3(c)).
 *
 * Fires here, on the extraction path, and NOT only in the conformance runner. A runner-only guard
 * is satisfied by a CI run on the pinned version while a drifted runtime resolves a different
 * `typescript`, extracts different names, and writes them into the reference cache under the
 * correctly-pinned key — a poisoned entry the key cannot detect, because the key trusts a pin the
 * runtime bypassed. Throwing here means a drifted runtime fails LOUDLY (INDETERMINATE) instead.
 */
export function assertCompiler(ts) {
  if (!ts || typeof ts !== 'object') {
    throw new Error('the named-export extractor requires the typescript compiler module')
  }
  // FIRST, and deliberately so: 7.x has no `version`-independent tell, and a membership failure
  // reported for the native port would send a maintainer looking for a patch to add to the set
  // rather than telling them their compiler has no JavaScript API at all.
  if (typeof ts.createProgram !== 'function') {
    throw new Error(
      `typescript ${ts.version ?? '(unknown)'} exposes no createProgram — this is the native (7.x) port, which has no JavaScript compiler API. ` +
        `Pin typescript to exactly one of ${VERIFIED_TS_VERSIONS.join(', ')}.`
    )
  }
  // MEMBERSHIP, never a range comparison. `startsWith`, a semver satisfies(), or a major/minor
  // compare would all admit an unmeasured patch — which is the set silently rotting back into the
  // `^5` range this contract exists to refuse.
  if (!VERIFIED_TS_VERSIONS.includes(ts.version)) {
    throw new Error(
      `typescript ${ts.version} is resolved at runtime but this contract is verified only against ${VERIFIED_TS_VERSIONS.join(', ')} (decision 0030). ` +
        'Two engines on unmeasured versions can extract different names, each pass their own conformance, and disagree on a real verdict. ' +
        'Adding a version requires re-running decisions/evidence/0030-ts-version-set and bumping EXTRACT_SPEC_VERSION.'
    )
  }
}

const VIRTUAL_ROOT = '/pkg'

/**
 * A hermetic CompilerHost that can see NOTHING but `files`. No disk, no node_modules, no tsconfig.
 *
 * Values are decoded to text LAZILY, on the first read the compiler actually performs. The engine
 * hands over a whole packed tarball — fonts, images, source maps — and eagerly decoding all of it
 * to UTF-8 would cost far more than the extraction itself while producing bytes nothing ever reads:
 * the compiler only ever opens the roots and what they resolve to, all of which are code.
 */
function createMemoryHost(ts, files) {
  const cache = new Map()
  const decoded = new Map()
  const textOf = (rel) => {
    if (decoded.has(rel)) {
      return decoded.get(rel)
    }
    const raw = files.get(rel)
    const value = raw === undefined ? undefined : typeof raw === 'string' ? raw : Buffer.from(raw).toString('utf8')
    decoded.set(rel, value)
    return value
  }
  const absolute = (rel) => `${VIRTUAL_ROOT}/${rel}`
  const relOf = (fileName) => (fileName.startsWith(`${VIRTUAL_ROOT}/`) ? fileName.slice(VIRTUAL_ROOT.length + 1) : normalizeRel(fileName))
  const directories = new Set([VIRTUAL_ROOT])
  for (const rel of files.keys()) {
    const parts = rel.split('/')
    for (let i = 1; i < parts.length; i++) {
      directories.add(absolute(parts.slice(0, i).join('/')))
    }
  }
  return {
    absolute,
    host: {
      getSourceFile(fileName, languageVersion) {
        if (cache.has(fileName)) {
          return cache.get(fileName)
        }
        const text = textOf(relOf(fileName))
        // `setParentNodes: true` — the unresolved-`export *` walk reads node text, which needs parents.
        const source = text === undefined ? undefined : ts.createSourceFile(fileName, text, languageVersion, true)
        cache.set(fileName, source)
        return source
      },
      // `noLib` is set, so nothing ever asks for this; answering with a name that is absent from the
      // map keeps the host honest if a future option change re-enables lib loading.
      getDefaultLibFileName: () => `${VIRTUAL_ROOT}/lib.d.ts`,
      writeFile: () => {},
      getCurrentDirectory: () => VIRTUAL_ROOT,
      getDirectories: (dir) => {
        const prefix = `${dir.replace(/\/+$/, '')}/`
        const out = new Set()
        for (const candidate of directories) {
          if (candidate.startsWith(prefix) && !candidate.slice(prefix.length).includes('/')) {
            out.add(candidate.slice(prefix.length))
          }
        }
        return [...out].sort(compareCodepoints)
      },
      directoryExists: (dir) => directories.has(dir.replace(/\/+$/, '')),
      // Case-SENSITIVE regardless of the host OS: a case-insensitive host would resolve
      // `./Foo` to `foo.d.ts` on macOS and fail on Linux, so the same tarball would extract
      // differently on two machines. Determinism includes the platform.
      getCanonicalFileName: (fileName) => fileName,
      useCaseSensitiveFileNames: () => true,
      getNewLine: () => '\n',
      fileExists: (fileName) => files.has(relOf(fileName)),
      readFile: (fileName) => textOf(relOf(fileName)),
      realpath: (fileName) => fileName
    }
  }
}

function symbolKind(ts, checker, symbol) {
  let resolved = symbol
  if (symbol.flags & ts.SymbolFlags.Alias) {
    // Resolve the alias BEFORE reading flags. Without this every re-export reads as a bare `Alias`
    // — no Value bit, no Type bit — so a re-exported value would be recorded with an unknowable
    // kind, and a type-only re-export would be indistinguishable from it (pre-mortem 4).
    try {
      resolved = checker.getAliasedSymbol(symbol)
    } catch {
      return 'unknown'
    }
  }
  if (resolved.flags & ts.SymbolFlags.Alias) {
    return 'unknown' // the alias chain does not terminate inside this payload
  }
  if (resolved.declarations === undefined || resolved.declarations.length === 0) {
    // MEASURED, not defensive: `getAliasedSymbol` on an alias that resolves to NOTHING (a named
    // re-export from a bare specifier the tarball does not contain — `export {ZodType} from 'zod'`)
    // hands back TypeScript's internal `unknownSymbol`, whose flags include `Property` and therefore
    // read as `value`. That is a silently wrong kind for a symbol nobody resolved. A symbol with no
    // declaration was not resolved, whatever its flags claim.
    return 'unknown'
  }
  if (resolved.flags & ts.SymbolFlags.Value) {
    return 'value'
  }
  if (resolved.flags & ts.SymbolFlags.Type) {
    return 'type'
  }
  return 'unknown'
}

/**
 * Is there an `export * from '<specifier>'` anywhere reachable from `entry` whose specifier does
 * not resolve inside this payload?
 *
 * Such a star export contributes an UNKNOWABLE set of names, so the whole subpath is INDETERMINATE.
 * A NAMED re-export from an unresolvable module (`export {Foo} from 'zod'`) is NOT this case: the
 * name `Foo` is right there in the syntax and is exactly what a consumer imports, so it is recorded
 * (with kind `unknown`) rather than blocking. The estate has ZERO bare star re-exports today
 * (probe, decision 0020); this branch exists so that stays measured rather than assumed.
 */
function findUnresolvedStarExport(ts, checker, entry) {
  const seen = new Set()
  const queue = [entry]
  while (queue.length > 0) {
    const source = queue.pop()
    if (!source || seen.has(source.fileName)) {
      continue
    }
    seen.add(source.fileName)
    for (const statement of source.statements) {
      if (!ts.isExportDeclaration(statement) || statement.moduleSpecifier === undefined) {
        continue
      }
      const isStar = statement.exportClause === undefined
      const moduleSymbol = checker.getSymbolAtLocation(statement.moduleSpecifier)
      if (moduleSymbol === undefined) {
        if (isStar) {
          const specifier = ts.isStringLiteral(statement.moduleSpecifier) ? statement.moduleSpecifier.text : '(unreadable specifier)'
          return `export * from '${specifier}' does not resolve inside the payload, so its names cannot be enumerated`
        }
        continue
      }
      if (isStar) {
        for (const declaration of moduleSymbol.declarations ?? []) {
          if (ts.isSourceFile(declaration)) {
            queue.push(declaration)
          }
        }
      }
    }
  }
  return null
}

/**
 * Compiler options fixed by the contract. Hermetic by construction: `noLib` (never reads a lib on
 * disk), Node10 resolution (resolves both extensionless `./x` and `./x.js` -> `x.d.ts`, which
 * NodeNext refuses for the former), `allowJs` so a JS-only subpath is enumerable rather than
 * indeterminate. NOTHING here is read from a tsconfig — an on-disk tsconfig would make the answer
 * depend on the checkout instead of the tarball.
 */
function compilerOptions(ts) {
  return {
    allowJs: true,
    checkJs: false,
    declaration: false,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    noEmit: true,
    noLib: true,
    noResolve: false,
    skipLibCheck: true,
    strict: false,
    target: ts.ScriptTarget.ES2022,
    types: []
  }
}

/**
 * Extract the named exports of every `exports` subpath in one packed payload.
 *
 * ONE `ts.Program` is built for the whole package (every code target is a root), not one per
 * subpath: a package with 15 subpaths would otherwise pay for 15 parses of the same shared `.d.ts`
 * graph, and the answer is identical either way.
 *
 * `ts` is INJECTABLE and defaults to the pinned import. The injection seam exists so a test can hand
 * over a compiler whose `version` is wrong and prove `assertCompiler` refuses it — the guard has to
 * be testable without uninstalling the real dependency, or it is a guard nobody ever fires.
 *
 * @param {{files: Map<string, string|Buffer>|Record<string, string>, manifestText: string|null, ts?: object}} input
 * @returns {{names: Record<string, {classification: string, names: Array<{name: string, kind: string}>, target: string|null, detail: string|null}>,
 *   extractSpecVersion: number}}
 */
export function extractSurfaceNames({files, manifestText, ts = defaultTs}) {
  assertCompiler(ts)
  const map = files instanceof Map ? files : new Map(Object.entries(files ?? {}))
  const raw = new Map()
  for (const [key, value] of map) {
    raw.set(normalizeRel(key), value)
  }
  const filePaths = [...raw.keys()].sort(compareCodepoints)
  const has = (rel) => raw.has(rel)

  const {targets} = readExportTargets(manifestText)
  /** subpath -> {classification, rel, detail, target} */
  const resolved = new Map()
  for (const [subpath, value] of Object.entries(targets)) {
    const {target, typed, detail} = resolveTarget(value)
    // ONLY THE KEY MAKES SOMETHING A PATTERN (measured against Node 24 — see expandWildcard). A
    // star in the target of a STARLESS key is a literal path character to Node, so it falls through
    // to the ordinary classifier and reads as a declared-but-absent target, which is Node's own
    // answer. Expanding it instead collapsed every match onto the one key and kept an arbitrary one.
    if (subpath.includes('*') && target !== null && target.includes('*')) {
      const expanded = expandWildcard(subpath, target, filePaths)
      if (!expanded.ok) {
        // A multi-star target cannot be reverse-globbed unambiguously. A2b: say so, never guess.
        resolved.set(subpath, {classification: CLASSIFICATIONS.INDETERMINATE, rel: null, target, detail: expanded.detail})
        continue
      }
      if (expanded.entries.length === 0) {
        // A wildcard matching nothing publishes nothing. It is determinable (the file set is the
        // tarball's, and it is empty for this pattern), not unknown.
        resolved.set(subpath, {
          classification: CLASSIFICATIONS.NO_SURFACE,
          rel: null,
          target,
          detail: `the wildcard target ${target} matches no packed file`
        })
        continue
      }
      for (const concrete of expanded.entries) {
        resolved.set(concrete.subpath, {...classifyTarget({target: concrete.target, typed, detail: null, has}), target: concrete.target})
      }
      continue
    }
    // A starred KEY with a STARLESS target is VALID and resolvable in Node: every subpath in the
    // family maps to that one file. Keeping the pattern key and classifying its single target
    // reports the right names for the whole family — do NOT "fix" this to INDETERMINATE.
    resolved.set(subpath, {...classifyTarget({target, typed, detail, has}), target})
  }

  const roots = [...new Set([...resolved.values()].filter((entry) => entry.classification === CLASSIFICATIONS.TYPED).map((entry) => entry.rel))].sort(
    compareCodepoints
  )

  const out = {}
  if (roots.length === 0) {
    for (const [subpath, entry] of [...resolved].sort((left, right) => compareCodepoints(left[0], right[0]))) {
      out[subpath] = shapeEntry(entry, entry.classification === CLASSIFICATIONS.SFC_ENTRY ? [...SFC_SYNTHETIC_NAMES] : [])
    }
    return {names: out, extractSpecVersion: EXTRACT_SPEC_VERSION}
  }

  const {absolute, host} = createMemoryHost(ts, raw)
  let program
  let checker
  try {
    program = ts.createProgram(roots.map(absolute), compilerOptions(ts), host)
    checker = program.getTypeChecker()
  } catch (error) {
    // A compiler that cannot even construct a Program has told us nothing about the surface. Every
    // typed subpath goes INDETERMINATE — the boundary never lets a throw escape as an empty set.
    for (const [subpath, entry] of [...resolved].sort((left, right) => compareCodepoints(left[0], right[0]))) {
      out[subpath] = entry.classification === CLASSIFICATIONS.TYPED
        ? shapeEntry({...entry, classification: CLASSIFICATIONS.INDETERMINATE, detail: `the compiler could not build a program: ${error?.message ?? error}`},
          [])
        : shapeEntry(entry, entry.classification === CLASSIFICATIONS.SFC_ENTRY ? [...SFC_SYNTHETIC_NAMES] : [])
    }
    return {names: out, extractSpecVersion: EXTRACT_SPEC_VERSION}
  }

  const byRoot = new Map()
  for (const rel of roots) {
    byRoot.set(rel, enumerateOne(ts, program, checker, absolute(rel), rel))
  }

  for (const [subpath, entry] of [...resolved].sort((left, right) => compareCodepoints(left[0], right[0]))) {
    if (entry.classification === CLASSIFICATIONS.SFC_ENTRY) {
      out[subpath] = shapeEntry(entry, [...SFC_SYNTHETIC_NAMES])
      continue
    }
    if (entry.classification !== CLASSIFICATIONS.TYPED) {
      out[subpath] = shapeEntry(entry, [])
      continue
    }
    const enumerated = byRoot.get(entry.rel)
    out[subpath] = enumerated.classification === CLASSIFICATIONS.TYPED
      ? shapeEntry(entry, enumerated.names)
      : shapeEntry({...entry, classification: enumerated.classification, detail: enumerated.detail}, [])
  }
  return {names: out, extractSpecVersion: EXTRACT_SPEC_VERSION}
}

function shapeEntry(entry, names) {
  return {classification: entry.classification, names: canonicalNames(names), target: entry.target ?? null, detail: entry.detail ?? null}
}

function enumerateOne(ts, program, checker, fileName, rel) {
  const source = program.getSourceFile(fileName)
  if (source === undefined) {
    return {classification: CLASSIFICATIONS.INDETERMINATE, names: [], detail: `${rel} could not be read by the compiler`}
  }
  const syntactic = program.getSyntacticDiagnostics(source)
  if (syntactic.length > 0) {
    const first = ts.flattenDiagnosticMessageText(syntactic[0].messageText, ' ')
    return {classification: CLASSIFICATIONS.INDETERMINATE, names: [], detail: `${rel} does not parse: ${first}`}
  }
  const unresolved = findUnresolvedStarExport(ts, checker, source)
  if (unresolved !== null) {
    return {classification: CLASSIFICATIONS.INDETERMINATE, names: [], detail: `${rel}: ${unresolved}`}
  }
  const moduleSymbol = checker.getSymbolAtLocation(source)
  if (moduleSymbol === undefined) {
    // Not a module — a script with no import/export. It publishes no names, and that is READ, not
    // assumed: the file parsed and declared nothing exportable.
    return {classification: CLASSIFICATIONS.TYPED, names: [], detail: null}
  }
  const names = []
  for (const symbol of checker.getExportsOfModule(moduleSymbol)) {
    // `symbol.name` is the EXPORTED name — what a consumer writes in an import — so `export {a as b}`
    // is recorded as `b`. The alias is resolved for the KIND only (symbolKind), never to rename.
    names.push({name: symbol.name, kind: symbolKind(ts, checker, symbol)})
  }
  return {classification: CLASSIFICATIONS.TYPED, names, detail: null}
}

/**
 * Is a cached reference surface usable as Level-2 evidence?
 *
 * THE A2b HOLE THIS CLOSES (decision 0028 §2.4, the blocker the consensus caught before any code
 * was written). The reference surface does NOT come from a tarball in steady state — it comes from
 * the digest cache, and a cache entry written before Level 2 existed carries `{kind, subpaths}` and
 * NO names. Reading Level-2 names out of such an entry yields an EMPTY SET, so a real named-export
 * removal reads as "no names removed" = green. "I could not read the surface" collapsing into "the
 * surface is empty" is precisely what A2b forbids.
 *
 * THE TEST IS FIELD PRESENCE, NEVER EMPTINESS. A package whose every subpath is an asset carries a
 * legitimately empty name set BY DESIGN; rejecting on emptiness would send those packages back to
 * the registry on every run, forever, for no signal. The v3 schema marker is the presence of the
 * `names` field, and that is the only thing this asks.
 */
export function acceptsCachedSurface(surface) {
  if (SURFACE_SPEC_VERSION < 3) {
    return true
  }
  if (!isRecord(surface)) {
    return false
  }
  if (surface.kind === 'unreadable') {
    // An unreadable surface has no names to carry and never had; it is already fail-closed
    // downstream (`surfaceDelta` returns required: null), so it is not a stale-schema entry.
    return true
  }
  return isRecord(surface.names)
}

export { CLASSIFICATIONS }

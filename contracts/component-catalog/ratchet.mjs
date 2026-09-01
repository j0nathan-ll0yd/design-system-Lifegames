#!/usr/bin/env node
/**
 * THE CONFORMANCE RATCHET.
 *
 * The catalog already WRITES every conformance gap: 31 of 33 widgets carry
 * `conformance.behavioralTest: null` and 29 carry `a11y.voiceOverLabel: null`. Writing a gap is not
 * ratcheting it. Before this module the debt was countable and permanent — nothing stopped a NEW
 * widget from landing with neither axis, and nothing stopped an existing widget from LOSING coverage
 * (a consumer test deleted, an `.accessibilityLabel(` removed) and silently rejoining the pile.
 *
 * So: a committed baseline of grandfathered ids, and a gate that fails on anything outside it.
 * Modeled on the estate's proven ratchet — `mantle-LifegamesPortal/scripts/openspec-covers-ratchet.mjs`
 * and its `openspec/covers-baseline.json` — down to the `--update-baseline` affordance, the
 * self-documenting header written INTO the artifact, and `abortRed` for a missing or unreadable
 * baseline. A gate that greens when its own input is missing is not a gate.
 *
 * THE PREDICATE, for each widget id in the catalog:
 *
 *   behavioral FAIL  <=>  entry.conformance.behavioralTest === null  AND  id NOT IN baseline.behavioralGap
 *   a11y       FAIL  <=>  entry.a11y.voiceOverLabel === null         AND  id NOT IN baseline.a11yGap
 *   PRUNABLE         <=>  id IN baseline.<list>  AND  that field is now populated
 *   STALE            <=>  id IN baseline.<list>  AND  no widget by that id is in the catalog
 *
 * FAIL and STALE are blocking. PRUNABLE is reported and non-blocking ON ITS OWN — but the baseline
 * MUST be pruned in the SAME PR that populates the field, which is what the report says and what the
 * `--update-baseline` affordance is for. STALE is blocking for the reason check 3 (completeness)
 * rejects a phantom contract: a grandfathering that names a deleted widget READS AS COVERED.
 *
 * WHY A11Y READS `voiceOverLabel` AND NOT `ref`: the grammar couples them in both directions
 * (`schema.mjs` checkA11y — a true label must cite `<file>:<line>`, and a null label must cite
 * nothing), so they are one fact written twice. Reading one is complete; reading both would invite a
 * disagreement the grammar has already made unreachable.
 *
 * WHY THE BASELINE IS A SEPARATE FILE AND NOT A CONTRACT FIELD: adding a field to the entry grammar
 * would bump `CATALOG_SPEC_VERSION`, invalidate the conformance vectors and their sha256 sidecar, and
 * drag the published `estate-contracts` surface into a widget-debt change. The debt list is not part
 * of what a widget IS.
 *
 * THE FREEZE (atlas decision 0102 move 1b). The three arms above all read the catalog against the
 * baseline. NONE of them reads the baseline against its own prior state, and that was the hole: a PR
 * could add an untested widget, run `--update-baseline`, and the new gap was ABSORBED into the
 * grandfathering — every arm green, the pile one bigger. The only thing standing against that was
 * the prose in the FAIL message and in the README ("only if the debt is genuinely unavoidable, and
 * say so in the PR body"), which is a tier-4 instruction control sitting on a machine path (B10).
 *
 * So a fourth, blocking arm: `evaluateFreeze`. Under CI — or `CATALOG_BASELINE_FROZEN=1` locally —
 * the committed baseline is compared against the baseline at the MERGE-BASE with the target branch,
 * and any id the current baseline holds that the base one did not is a RAISE, which FAILS.
 *
 * IDENTITY-KEYED, NOT A COUNT. The comparison is set difference per axis, never a total. A numeric
 * budget greens a swap — one gap closed, a different one opened — and re-seeds itself worse on every
 * legitimate closure. That is betterer's known defect, and the estate's baselines are identity-keyed
 * precisely so it cannot happen here.
 *
 * THE JUSTIFIED RAISE IS SEPARATELY NAMED, and it names WHAT it raises. Two carriers, one grammar:
 *
 *   Baseline-Raise: <axis>:<widget-id> <reason>
 *
 * as a trailer on any commit in `<base>..HEAD` (the auditable path — it lands in the history of
 * `main` and a reviewer reads it in the PR), or in `CATALOG_BASELINE_RAISE` (the local and
 * workflow-dispatch path). A raise must name the exact axis and id it raises and must carry a
 * non-empty reason; a blanket "skip the freeze" signal does not exist, because the control IS being
 * made to write down which coverage you are giving up. Modeled on eslint-seatbelt's
 * `SEATBELT_FROZEN`/`SEATBELT_INCREASE=<rule>` pair and on imbue-ai/ratchets, where `ratchets bump`
 * is the only way to raise and requires a justification in the commit message.
 *
 * IT CHECKS THE OUTCOME, NOT THE WRITE. `--update-baseline` is deliberately still allowed to run
 * while frozen. Blocking the writer would catch one way to grow the baseline and miss the other — a
 * hand-edit — whereas comparing the committed bytes against the base catches both, and catches them
 * in CI where the merge gate binds rather than only on the machine that ran the writer.
 */

import {spawnSync} from 'node:child_process'
import {existsSync, readFileSync, writeFileSync} from 'node:fs'
import {join, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import * as prettier from 'prettier'

const HERE = fileURLToPath(new URL('.', import.meta.url))
export const BASELINE_PATH = join(HERE, 'conformance-baseline.json')
export const BASELINE_REL = 'contracts/component-catalog/conformance-baseline.json'
export const REPO_ROOT = resolve(HERE, '../..')

/** The two ratcheted axes, in the order they are reported. `read` is the gap predicate for one entry. */
export const AXES = [
  {
    key: 'behavioralGap',
    label: 'behavioral conformance test',
    isGap: (entry) => entry?.conformance?.behavioralTest === null,
    remedy: 'land the consumer render test, add its path to `BEHAVIORAL_TESTS` in contracts/component-catalog/generate.mjs, then regenerate'
  },
  {
    key: 'a11yGap',
    label: 'recorded a11y label',
    isGap: (entry) => entry?.a11y?.voiceOverLabel === null,
    remedy: "add an `.accessibilityLabel(` to the widget's Swift view, then regenerate"
  }
]

/** Thrown for a baseline that cannot be trusted. `check.mjs` turns this into an immediate RED. */
export class BaselineError extends Error {
  constructor(message) {
    super(message)
    this.name = 'BaselineError'
  }
}

/**
 * Read the committed baseline. A missing, unparseable or malformed baseline THROWS — it is never
 * treated as an empty set, because an empty set would red every grandfathered widget (noise nobody
 * can act on) and a permissive default would green every new one (a gate that is not a gate).
 *
 * @param {string} [path]
 * @returns {{behavioralGap: Set<string>, a11yGap: Set<string>, description?: string}}
 */
export function readBaseline(path = BASELINE_PATH) {
  if (!existsSync(path)) {
    throw new BaselineError(`${BASELINE_REL} not found. Generate it once with:\n` + '  node contracts/component-catalog/check.mjs --update-baseline')
  }
  return parseBaseline(readFileSync(path, 'utf8'), BASELINE_REL)
}

/**
 * Validate baseline bytes into the two id sets. Split out of `readBaseline` so the FREEZE reads the
 * base revision's copy through exactly the same grammar the working-tree copy is held to — a base
 * baseline that parsed more loosely than the current one would let a malformed prior state widen
 * what counts as "already grandfathered".
 *
 * @param {string} bytes
 * @param {string} source how to name the file in an error — the repo-relative path, or `<rev>:<path>`
 * @returns {{behavioralGap: Set<string>, a11yGap: Set<string>}}
 */
export function parseBaseline(bytes, source = BASELINE_REL) {
  let parsed
  try {
    parsed = JSON.parse(bytes)
  } catch (error) {
    throw new BaselineError(`${source} is not valid JSON — ${error.message}. Regenerate with \`--update-baseline\`.`)
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new BaselineError(`${source} is malformed — expected an object with \`behavioralGap\` and \`a11yGap\` arrays.`)
  }
  const sets = {}
  for (const {key} of AXES) {
    const list = parsed[key]
    if (!Array.isArray(list) || list.some((id) => typeof id !== 'string' || id.length === 0)) {
      throw new BaselineError(`${source} is malformed — \`${key}\` must be an array of non-empty widget ids.`)
    }
    const seen = new Set(list)
    if (seen.size !== list.length) {
      throw new BaselineError(`${source} is malformed — \`${key}\` contains duplicate ids.`)
    }
    sets[key] = seen
  }
  return sets
}

/** The gap id lists the current catalog implies, sorted. This is what `--update-baseline` records. */
export function gapsFromEntries(entries) {
  const gaps = {}
  for (const {key, isGap} of AXES) {
    gaps[key] = entries.filter((entry) => isGap(entry)).map((entry) => entry.widget).sort()
  }
  return gaps
}

const DESCRIPTION = 'Grandfathered baseline of widgets with no behavioral conformance test (behavioralGap) and no recorded a11y ' +
  'label (a11yGap). contracts/component-catalog/check.mjs FAILS on a widget whose field is null and whose id is NOT in the ' +
  'matching list — i.e. a NEW widget shipped with no test, or a REGRESSION where a populated field went back to null. It also ' +
  'FAILS on a listed id that names no widget in the catalog, because a grandfathering for a deleted widget reads as covered. ' +
  'Closing a gap prunes its id in the SAME PR that closes it: a behavioral test also needs its path added to BEHAVIORAL_TESTS in ' +
  'generate.mjs and a regenerate; an a11y label needs an `.accessibilityLabel(` in the Swift view and a regenerate. This file is ' +
  'generated — never hand-edit an id in or out. It is also FROZEN: under CI (or CATALOG_BASELINE_FROZEN=1) the gate compares these ' +
  'lists against the same file at the merge base and FAILS on any id that was ADDED, so `--update-baseline` cannot silently absorb ' +
  'a new gap. Raising the baseline needs a `Baseline-Raise: <axis>:<widget-id> <reason>` trailer on a commit in the branch, which ' +
  'names what coverage is being given up and records why in the history of main.'

/**
 * Write the baseline, sorted and normalized, with the self-documenting header written INTO the
 * artifact rather than only into this file. Formatted through Prettier from the baseline's REAL
 * path (never a caller-supplied one), so the bytes a fresh `--update-baseline` writes are the bytes
 * `pnpm format:check` expects — the same rule, and the same trap, as `formatJson` in generate.mjs.
 *
 * @returns {Promise<{behavioralGap: string[], a11yGap: string[]}>} the recorded lists
 */
export async function writeBaseline(entries, path = BASELINE_PATH) {
  const gaps = gapsFromEntries(entries)
  const payload = {description: DESCRIPTION, generatedBy: 'node contracts/component-catalog/check.mjs --update-baseline', ...gaps}
  const cfg = await prettier.resolveConfig(BASELINE_PATH)
  writeFileSync(path, await prettier.format(JSON.stringify(payload, null, 2), {...cfg, parser: 'json', filepath: BASELINE_PATH}))
  return gaps
}

/**
 * Apply the ratchet.
 *
 * @param {{entries: object[], baseline: {behavioralGap: Set<string>, a11yGap: Set<string>}}} options
 * @returns {{failures: string[], prunable: string[]}} failures block; prunable is reported only
 */
export function evaluateRatchet({entries, baseline}) {
  const failures = []
  const prunable = []
  const ids = new Set(entries.map((entry) => entry.widget))

  for (const {key, label, isGap, remedy} of AXES) {
    const grandfathered = baseline[key]

    for (const entry of [...entries].sort((a, b) => a.widget.localeCompare(b.widget))) {
      const gap = isGap(entry)
      if (gap && !grandfathered.has(entry.widget)) {
        failures.push(
          `${entry.widget}: no ${label}, and its id is not grandfathered in ${BASELINE_REL} \`${key}\`. ` +
            `This is a NEW widget with no coverage, or a REGRESSION where a populated field went back to null. ` +
            `Fix by closing the gap (${remedy}). Re-recording with ` +
            '`node contracts/component-catalog/check.mjs --update-baseline` silences THIS check but the baseline is FROZEN, ' +
            `so check 5 then blocks the added id until a \`${RAISE_KEY}: ${key}:${entry.widget} <reason>\` trailer justifies it.`
        )
      }
      if (!gap && grandfathered.has(entry.widget)) {
        prunable.push(`${key}: \`${entry.widget}\` now has a ${label} — prune its id from ${BASELINE_REL} in THIS PR (\`--update-baseline\`).`)
      }
    }

    // A grandfathering that names nothing reads as covered, exactly like a phantom contract does to
    // check 3. It also silently un-ratchets the id if a widget is ever re-added under that name.
    for (const id of [...grandfathered].sort()) {
      if (!ids.has(id)) {
        failures.push(
          `${BASELINE_REL} \`${key}\` lists \`${id}\`, which is not a widget in the catalog. ` +
            'A grandfathering for a deleted or renamed widget reads as covered — prune it with `--update-baseline`.'
        )
      }
    }
  }

  return {failures, prunable}
}

// ── THE FREEZE ───────────────────────────────────────────────────────────────

/** Environment names the freeze reads. Kept together so the docs and the code cannot drift apart. */
export const FREEZE_ENV = {frozen: 'CATALOG_BASELINE_FROZEN', raise: 'CATALOG_BASELINE_RAISE', base: 'CATALOG_BASELINE_BASE'}

/** The trailer key that carries a justified raise into git history. */
export const RAISE_KEY = 'Baseline-Raise'

/** The refs the freeze will compare against, in order, when `CATALOG_BASELINE_BASE` is unset. */
const BASE_CANDIDATES = (env) => [env.GITHUB_BASE_REF ? `origin/${env.GITHUB_BASE_REF}` : null, 'origin/main', 'origin/HEAD', 'main'].filter(Boolean)

/** Thrown when the freeze cannot establish what it is freezing against. `check.mjs` turns it into RED. */
export class FreezeError extends Error {
  constructor(message) {
    super(message)
    this.name = 'FreezeError'
  }
}

/**
 * Environment variables that relocate git's idea of the repository, the work tree or the index.
 * Every one of them OUTRANKS `cwd`, and git exports the first several to every hook it runs — so a
 * gate invoked from `.husky/pre-push` inherits them. Here they happen to point at the repo we want
 * anyway, which means an unstripped `git()` reads the right repository by luck rather than by
 * construction; under a worktree, a submodule or a test harness the luck runs out. `cwd` is this
 * function's only statement of where to look, so nothing else is allowed to answer that question.
 */
const GIT_LOCATION_ENV = [
  'GIT_DIR',
  'GIT_WORK_TREE',
  'GIT_INDEX_FILE',
  'GIT_COMMON_DIR',
  'GIT_OBJECT_DIRECTORY',
  'GIT_ALTERNATE_OBJECT_DIRECTORIES',
  'GIT_NAMESPACE',
  'GIT_PREFIX',
  'GIT_CEILING_DIRECTORIES'
]

/** One git invocation, in `cwd` and nowhere else. Returns `{ok, stdout, stderr}` — never throws. */
export function git(args, cwd = REPO_ROOT) {
  const env = {...process.env}
  for (const name of GIT_LOCATION_ENV) {
    delete env[name]
  }
  const result = spawnSync('git', args, {cwd, env, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024})
  if (result.error) {
    return {ok: false, stdout: '', stderr: result.error.message}
  }
  return {ok: result.status === 0, stdout: (result.stdout ?? '').trim(), stderr: (result.stderr ?? '').trim()}
}

/**
 * Is the baseline frozen for this run?
 *
 * `CI` implies frozen, the way eslint-seatbelt's does: the merge gate is the place a raise has to be
 * caught, and every CI provider sets it. `CATALOG_BASELINE_FROZEN=1` turns it on locally, which is
 * what `.husky/pre-push` does so the feedback arrives before the push rather than after it.
 *
 * There is deliberately NO value that turns the freeze OFF. An unlock switch would be the bypass the
 * whole arm exists to remove; the ways past are closing the gap or naming a justified raise.
 */
export function isFrozen(env = process.env) {
  const truthy = (value) => typeof value === 'string' && value.length > 0 && value !== '0' && value.toLowerCase() !== 'false'
  return truthy(env[FREEZE_ENV.frozen]) || truthy(env.CI)
}

/**
 * Parse one raise value — `<axis>:<widget-id> <reason>` — into `{axis, id, reason}`, or `{error}`.
 *
 * The reason is REQUIRED. A raise with no reason is the thing this arm was added to stop: a silent
 * absorb, with a signal in front of it instead of prose.
 */
export function parseRaiseValue(value) {
  const raw = String(value ?? '').trim()
  const axes = AXES.map(({key}) => key)
  const shape = `expected \`${RAISE_KEY}: <${axes.join('|')}>:<widget-id> <reason>\``
  if (raw.length === 0) {
    return {error: `empty raise — ${shape}.`}
  }
  const match = /^(\S+?):(\S+)(?:\s+(.*))?$/.exec(raw)
  if (!match) {
    return {error: `\`${raw}\` is not a raise — ${shape}.`}
  }
  const [, axis, id, tail] = match
  if (!axes.includes(axis)) {
    return {error: `\`${raw}\` names axis \`${axis}\`, which is not one of ${axes.join(', ')}.`}
  }
  const reason = (tail ?? '').replace(/^[—–-]\s+/, '').trim()
  if (reason.length === 0) {
    return {error: `\`${raw}\` raises \`${axis}:${id}\` with no reason. A raise must say WHY the gap is unavoidable.`}
  }
  return {axis, id, reason}
}

/**
 * Collect every justified raise offered to this run, from both carriers.
 *
 * @param {{env?: object, messages?: string}} options `messages` is the concatenated commit-message
 *   text of `<base>..HEAD`; only lines whose key is `RAISE_KEY` are read out of it.
 * @returns {{raises: Array<{axis: string, id: string, reason: string, carrier: string}>, errors: string[]}}
 */
export function collectRaises({env = process.env, messages = ''} = {}) {
  const raises = []
  const errors = []
  const trailer = new RegExp(`^\\s*${RAISE_KEY}\\s*:\\s*(.+?)\\s*$`, 'i')
  const offered = []

  for (const line of String(messages).split('\n')) {
    const found = trailer.exec(line)
    if (found) {
      offered.push([found[1], `${RAISE_KEY} trailer`])
    }
  }
  // The env carrier takes bare values, one per line or per `;` — it is the local and
  // workflow-dispatch path, where there is no commit to hang a trailer on yet.
  for (const chunk of String(env[FREEZE_ENV.raise] ?? '').split(/[\n;]/)) {
    if (chunk.trim().length > 0) {
      offered.push([chunk.replace(trailer, '$1'), `${FREEZE_ENV.raise}`])
    }
  }

  for (const [value, carrier] of offered) {
    const parsed = parseRaiseValue(value)
    if (parsed.error) {
      errors.push(`${carrier}: ${parsed.error}`)
    } else {
      raises.push({...parsed, carrier})
    }
  }
  return {raises, errors}
}

/**
 * The freeze arm. Compare the current baseline against the base revision's baseline, per axis, by
 * IDENTITY.
 *
 * @param {{baseline: object, base: object|null, raises?: object[], raiseErrors?: string[], describeBase?: string}} options
 *   `base` is `null` when the baseline file does not exist at the base revision, which makes every
 *   id in the current baseline a raise — a seed nobody reviewed reads exactly like an absorb.
 * @returns {{failures: string[], notes: string[]}} failures block; notes are reported only
 */
export function evaluateFreeze({baseline, base, raises = [], raiseErrors = [], describeBase = 'the merge base'}) {
  const failures = [...raiseErrors]
  const notes = []
  const matched = new Set()

  for (const {key, label} of AXES) {
    const before = base === null ? new Set() : base[key]
    const grown = [...baseline[key]].filter((id) => !before.has(id)).sort()

    for (const id of grown) {
      const raise = raises.find((candidate) => candidate.axis === key && candidate.id === id)
      if (raise) {
        matched.add(raise)
        notes.push(`freeze: \`${key}:${id}\` raised via ${raise.carrier} — "${raise.reason}".`)
        continue
      }
      failures.push(
        `${BASELINE_REL} \`${key}\` grew: \`${id}\` is grandfathered here but was NOT at ${describeBase}. ` +
          `The baseline is FROZEN, so \`--update-baseline\` cannot absorb a new ${label} gap. ` +
          `Close the gap, or justify the raise with a \`${RAISE_KEY}: ${key}:${id} <reason>\` trailer on a commit in this branch ` +
          `(or ${FREEZE_ENV.raise}="${key}:${id} <reason>" for a local run).`
      )
    }

    const shrunk = base === null ? [] : [...before].filter((id) => !baseline[key].has(id))
    if (shrunk.length > 0) {
      notes.push(`freeze: \`${key}\` shrank by ${shrunk.length} — ${shrunk.sort().join(', ')}. The ratchet moved the right way.`)
    }
  }

  // A raise that matches no growth is dead weight, not a violation: it is what a trailer left behind
  // after the gap was closed looks like. Report it so it gets removed, but never red a PR for it.
  for (const raise of raises) {
    if (!matched.has(raise)) {
      notes.push(`freeze: \`${RAISE_KEY}: ${raise.axis}:${raise.id}\` (${raise.carrier}) matches no new gap — remove it.`)
    }
  }

  return {failures, notes}
}

/**
 * Resolve the commit the freeze compares against.
 *
 * A NAMED ref is resolved through `git merge-base`, so a branch is judged on what IT added and not
 * on what the target branch has landed since it forked. `CATALOG_BASELINE_BASE` overrides with a
 * VERBATIM commit-ish, no merge-base — it exists for the tests and for a CI provider that hands the
 * base sha over directly.
 *
 * Failure to resolve is a hard error, never a skip. A gate that greens when its own input is missing
 * is not a gate, which is the same rule `readBaseline` follows for a missing baseline.
 *
 * @returns {{commit: string, describe: string}}
 */
export function resolveFreezeBase({env = process.env, cwd = REPO_ROOT} = {}) {
  const override = String(env[FREEZE_ENV.base] ?? '').trim()
  if (override.length > 0) {
    const resolved = git(['rev-parse', '--verify', '--quiet', `${override}^{commit}`], cwd)
    if (!resolved.ok || resolved.stdout.length === 0) {
      throw new FreezeError(`${FREEZE_ENV.base}=\`${override}\` does not resolve to a commit in this repository.`)
    }
    return {commit: resolved.stdout, describe: `${FREEZE_ENV.base} \`${override}\``}
  }

  const tried = []
  for (const ref of BASE_CANDIDATES(env)) {
    const resolved = git(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`], cwd)
    if (!resolved.ok || resolved.stdout.length === 0) {
      tried.push(`${ref} (no such ref)`)
      continue
    }
    const mergeBase = git(['merge-base', resolved.stdout, 'HEAD'], cwd)
    if (!mergeBase.ok || mergeBase.stdout.length === 0) {
      // Almost always a shallow clone: the ref is there but the shared ancestor was never fetched.
      tried.push(`${ref} (no merge base with HEAD — shallow clone? try \`git fetch --unshallow\`)`)
      continue
    }
    return {commit: mergeBase.stdout, describe: `the merge base with ${ref}`}
  }

  throw new FreezeError(
    `the baseline is FROZEN but no base revision could be resolved. Tried: ${tried.join('; ')}. ` +
      `Fetch the target branch (\`git fetch origin main\`, or \`fetch-depth: 0\` on the CI checkout), ` +
      `or point ${FREEZE_ENV.base} at the base commit.`
  )
}

/** Read the baseline as it exists at `commit`. Returns `null` when the file is not there at all. */
export function readBaselineAtRef(commit, cwd = REPO_ROOT) {
  const spec = `${commit}:${BASELINE_REL}`
  if (!git(['cat-file', '-e', spec], cwd).ok) {
    return null
  }
  const shown = git(['show', spec], cwd)
  if (!shown.ok) {
    throw new FreezeError(`could not read \`${spec}\` — ${shown.stderr}`)
  }
  return parseBaseline(shown.stdout, spec)
}

/** Every commit message in `<commit>..HEAD`, concatenated. The carrier for auditable raises. */
export function commitMessagesSince(commit, cwd = REPO_ROOT) {
  const log = git(['log', '--format=%B', `${commit}..HEAD`], cwd)
  return log.ok ? log.stdout : ''
}

/**
 * The whole freeze arm, as `check.mjs` runs it: decide, resolve, read, collect, compare.
 *
 * Kept here rather than in `check.mjs` so the git plumbing is reachable from `ratchet.test.mjs`,
 * which drives it against a real throwaway repository. An arm whose only exercise is the gate that
 * calls it is an arm nobody has watched fail.
 *
 * @returns {{frozen: boolean, describe: string, failures: string[], notes: string[]}}
 */
export function runFreezeCheck({baseline, env = process.env, cwd = REPO_ROOT}) {
  if (!isFrozen(env)) {
    return {frozen: false, describe: `not frozen — set ${FREEZE_ENV.frozen}=1 (CI sets it implicitly)`, failures: [], notes: []}
  }
  const {commit, describe} = resolveFreezeBase({env, cwd})
  const base = readBaselineAtRef(commit, cwd)
  const {raises, errors} = collectRaises({env, messages: commitMessagesSince(commit, cwd)})
  const describeBase = `${describe} (${commit.slice(0, 9)})`
  const outcome = evaluateFreeze({baseline, base, raises, raiseErrors: errors, describeBase})
  if (base === null) {
    outcome.notes.unshift(`freeze: ${BASELINE_REL} does not exist at ${describeBase} — every grandfathered id reads as a raise.`)
  }
  return {frozen: true, describe: `frozen against ${describeBase}`, ...outcome}
}

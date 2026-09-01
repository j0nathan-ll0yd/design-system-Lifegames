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
 */

import {existsSync, readFileSync, writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import * as prettier from 'prettier'

const HERE = fileURLToPath(new URL('.', import.meta.url))
export const BASELINE_PATH = join(HERE, 'conformance-baseline.json')
export const BASELINE_REL = 'contracts/component-catalog/conformance-baseline.json'

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
  let parsed
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    throw new BaselineError(`${BASELINE_REL} is not valid JSON — ${error.message}. Regenerate with \`--update-baseline\`.`)
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new BaselineError(`${BASELINE_REL} is malformed — expected an object with \`behavioralGap\` and \`a11yGap\` arrays.`)
  }
  const sets = {}
  for (const {key} of AXES) {
    const list = parsed[key]
    if (!Array.isArray(list) || list.some((id) => typeof id !== 'string' || id.length === 0)) {
      throw new BaselineError(`${BASELINE_REL} is malformed — \`${key}\` must be an array of non-empty widget ids.`)
    }
    const seen = new Set(list)
    if (seen.size !== list.length) {
      throw new BaselineError(`${BASELINE_REL} is malformed — \`${key}\` contains duplicate ids.`)
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
  'generated — never hand-edit an id in or out.'

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
            `Fix by closing the gap (${remedy}), or — only for genuinely new grandfathered debt, which the PR body must justify — ` +
            'run `node contracts/component-catalog/check.mjs --update-baseline`.'
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

// Focus-mode suppression verdict for a credential-free audit that probes gated artifacts.
//
// Port of mantle-LifegamesPortal audits/lib/focus-suppression.mjs (`readFocusSuppression`) as of
// LP commit 90d8b58, the file's last change at LP origin/main 693ff8b: diff against that. It is the
// signal LP's C14 reads before it HEADs any image key (c14-image-materialization.mts). The
// CloudFront focus gate (LP src/edge/focus-gate.js) answers every /images/books/ and
// /images/theatre/ key with a JSON 403 while a hiding focus mode is on, so an audit that probes
// those keys must read the ungated focus.json first. Kept dependency-free: this repo cannot
// import LP's module. Same states and the same fail-open rule:
//
//   VISIBLE     focus.json names a non-hiding mode.
//   SUPPRESSED  a hiding mode, inside the 24 h bound from hidingSince.
//   OVERDUE     a hiding mode whose bound cannot be enforced (no, unparseable or future
//               hidingSince) or has elapsed. NOT a suppression licence.
//   UNKNOWN     focus.json could not be read or parsed. NOT a suppression licence.

export const MAX_SUPPRESSION_MS = 24 * 60 * 60 * 1000
export const FOCUS_TIMEOUT_MS = 20_000

/**
 * The focus modes that hide the public surface. Mirrors HIDING_FOCUS_MODES in
 * the portal-contract package (LP packages/portal-contract, `./constants`);
 * audits/__tests__/d7-focus-modes.test.mjs pins
 * the two equal. A literal here, because the D7 job installs no dependencies.
 */
export const HIDING_MODES = new Set(['Work', 'Do Not Disturb'])

/**
 * Read the ungated focus signal at `<origin of targetUrl>/focus.json`.
 * @param {string} targetUrl any URL on the distribution
 * @param {typeof fetch} fetchImpl
 * @param {Date} now
 */
export async function readFocusSuppression(targetUrl, fetchImpl = fetch, now = new Date()) {
  const focusUrl = new URL('/focus.json', targetUrl).toString()
  const unknown = (evidence) => ({state: 'UNKNOWN', focusUrl, hidingSince: null, durationMs: null, evidence})
  let response
  try {
    response = await fetchImpl(focusUrl, {method: 'GET', cache: 'no-store', signal: AbortSignal.timeout(FOCUS_TIMEOUT_MS)})
  } catch (error) {
    return unknown(`GET ${focusUrl} failed: ${error instanceof Error ? error.message : String(error)}`)
  }
  if (!response || typeof response.status !== 'number') {
    return unknown(`GET ${focusUrl} returned no response`)
  }
  if (!response.ok) {
    return unknown(`GET ${focusUrl} -> HTTP ${response.status}`)
  }

  let payload
  try {
    payload = JSON.parse(await response.text())
  } catch {
    return unknown(`GET ${focusUrl} -> 200 but body is not valid JSON`)
  }
  if (typeof payload?.currentFocus !== 'string') {
    return unknown(`GET ${focusUrl} -> 200 but currentFocus is missing`)
  }
  if (!HIDING_MODES.has(payload.currentFocus)) {
    return {state: 'VISIBLE', focusUrl, hidingSince: null, durationMs: null, evidence: `focus mode ${payload.currentFocus} is visible`}
  }

  const hidingSince = typeof payload.hidingSince === 'string' ? payload.hidingSince : null
  const hidingSinceMs = hidingSince === null ? Number.NaN : Date.parse(hidingSince)
  const bound = formatHidingDuration(MAX_SUPPRESSION_MS)
  if (Number.isNaN(hidingSinceMs)) {
    return {
      state: 'OVERDUE',
      focusUrl,
      hidingSince,
      durationMs: null,
      evidence: hidingSince === null
        ? `focus mode is hiding but the payload carries no hidingSince, so the ${bound} bound cannot be enforced`
        : `focus mode is hiding but hidingSince ${JSON.stringify(hidingSince)} is not a parseable instant, so the ${bound} bound cannot be enforced`
    }
  }
  const durationMs = now.getTime() - hidingSinceMs
  if (durationMs < 0) {
    return {
      state: 'OVERDUE',
      focusUrl,
      hidingSince,
      durationMs,
      evidence:
        `focus mode is hiding but hidingSince ${hidingSince} is after the observation time ${now.toISOString()}, so the ${bound} bound cannot be enforced`
    }
  }
  if (durationMs > MAX_SUPPRESSION_MS) {
    return {
      state: 'OVERDUE',
      focusUrl,
      hidingSince,
      durationMs,
      evidence: `focus mode has been hiding for ${formatHidingDuration(durationMs)} since ${hidingSince}, beyond the ${bound} bound`
    }
  }
  return {
    state: 'SUPPRESSED',
    focusUrl,
    hidingSince,
    durationMs,
    evidence: `focus mode has been hiding for ${formatHidingDuration(durationMs)} since ${hidingSince}`
  }
}

/** Render a hiding interval with one-hour decimal precision. */
export function formatHidingDuration(durationMs) {
  return `${(durationMs / (60 * 60 * 1000)).toFixed(1)}h`
}

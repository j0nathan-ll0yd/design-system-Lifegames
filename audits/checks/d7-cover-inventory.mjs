#!/usr/bin/env node
// mantle-cli-output: cover-inventory probe report
/**
 * D7 — cover inventory matches the distribution (report-only).
 *
 * `packages/fixtures/src/cover-inventory.ts` COVER_KEYS is a committed snapshot of
 * which cover keys the CloudFront distribution serves, per ASIN. The fixture gates
 * (cover-integrity.test.ts) trust it offline. Nothing else re-reads the live bucket,
 * so the snapshot can go stale silently: before COVER_KEYS, two ASINs began serving
 * and the hand list never learned of it.
 *
 * For every ASIN in COVER_KEYS this sends HEAD to all six derivative keys. A listed
 * key must be present and an omitted key absent. Each answer is judged on its status
 * AND its content type, measured on the distribution 2026-11-02:
 *
 *   present   200 with an image/* content type (a real cover: image/webp, image/avif).
 *   absent    403 with application/xml: S3's AccessDenied for a missing key (server
 *             AmazonS3). The distribution answers 403, not 404, for a missing key.
 *   unjudged  anything else. In particular the focus gate (mantle-LifegamesPortal
 *             src/edge/focus-gate.js) answers every /images/books/ key with 403 and
 *             application/json while a hiding focus mode is on: that is a suppression,
 *             not an absent key.
 *
 * Before any key, it reads the ungated focus.json (audits/lib/focus-suppression.mjs,
 * LP's C14 pattern). While covers are SUPPRESSED it probes nothing and reports
 * INDETERMINATE. OVERDUE and UNKNOWN license nothing: it probes, and the JSON-403 rule
 * above still keeps a live gate from reading as a mismatch.
 *
 * Controls, so an interceptor that answers every key alike cannot PASS:
 *   - negative: CONTROL_KEY, a key no pipeline writes, must answer absent;
 *   - positive: at least one listed key must be judged, so a listing with no
 *     expected-present key measures nothing.
 *
 * Verdicts:
 *   PASS           every key answered as the snapshot says, and both controls held.
 *   MISMATCH       a listed key answered absent or an omitted key answered present.
 *                  Each is named by ASIN and key.
 *   INDETERMINATE  covers are suppressed, a key or the control was unjudged, the control
 *                  answered present, or no listed key was judged. An unreachable host is
 *                  INDETERMINATE, never PASS. Mismatches found alongside are still reported.
 *
 * Egress: the self-hosted Linux fleet reaches CloudFront only from the `cfedge` lane
 * (ci-runners-private RUNNERS.md "CloudFront edges on their own lane").
 *
 * Report-only by default: exits 0 in all cases, and under GitHub Actions a verdict other
 * than PASS also prints a workflow warning. `--check` exits 1 on MISMATCH and 2 on
 * INDETERMINATE.
 *
 * Usage:
 *   node audits/checks/d7-cover-inventory.mjs           — report
 *   node audits/checks/d7-cover-inventory.mjs --check   — exit non-zero on a finding
 */

import {pathToFileURL} from 'node:url'

import {COVER_KEYS, COVER_ORIGIN, COVER_SUFFIXES} from '../../packages/fixtures/src/cover-inventory.ts'
import {readFocusSuppression} from '../lib/focus-suppression.mjs'

// Coverage declaration for the hub's A18 check (atlas decision 0145): metadata only,
// parsed statically. A literal array of literal objects, one `surfaceId` each.
export const ARTIFACTS = [{surfaceId: 'exported-images'}]

/** A plain, identifying User-Agent. No contact detail of any kind. */
export const USER_AGENT = 'lifegames-ds-audit-d7/1'
/** A key under the cover prefix that no pipeline writes: the negative control. */
export const CONTROL_KEY = 'd7-negative-control.webp'
const TIMEOUT_MS = 10_000
const ATTEMPTS = 2
const CONCURRENCY = 6

/**
 * HEAD one key and return the facts the judgement needs: `{status, contentType}`, or
 * `{error}` on a network failure, a timeout or a non-response. Retries once on an
 * error or a 5xx.
 * @param {string} url
 * @param {typeof fetch} fetchImpl
 */
export async function probeKey(url, fetchImpl = fetch) {
  let last = {error: 'not attempted'}
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    try {
      const res = await fetchImpl(url, {method: 'HEAD', redirect: 'manual', headers: {'User-Agent': USER_AGENT}, signal: AbortSignal.timeout(TIMEOUT_MS)})
      if (!res || typeof res.status !== 'number') {
        last = {error: 'no response'}
        continue
      }
      last = {status: res.status, contentType: (res.headers?.get?.('content-type') ?? '').toLowerCase()}
      if (res.status < 500) {
        return last
      }
    } catch (err) {
      last = {error: err instanceof Error ? `${err.name}: ${err.message}` : String(err)}
    }
  }
  return last
}

/**
 * Judge one probe result: `{answer: 'present' | 'absent'}`, or `{answer: 'unjudged', why}`.
 * @param {{status?: number, contentType?: string, error?: string} | undefined} result
 */
export function judgeKey(result) {
  if (!result || typeof result !== 'object') {
    return {answer: 'unjudged', why: 'no probe result'}
  }
  if (result.error !== undefined) {
    return {answer: 'unjudged', why: result.error}
  }
  const type = result.contentType ?? ''
  if (result.status === 200) {
    return type.startsWith('image/') ? {answer: 'present'} : {answer: 'unjudged', why: `200 with content-type ${type || 'none'}, not an image`}
  }
  if (result.status === 403) {
    if (type.includes('application/json')) {
      return {answer: 'unjudged', why: '403 application/json: the focus gate suppressed it'}
    }
    return type.includes('application/xml')
      ? {answer: 'absent'}
      : {answer: 'unjudged', why: `403 with content-type ${type || 'none'}, not the S3 xml denial`}
  }
  return {answer: 'unjudged', why: `status ${String(result.status)}`}
}

/**
 * Read focus.json, then probe every key of every inventoried ASIN plus the control,
 * and judge it all against the snapshot.
 * @param {{inventory?: Readonly<Record<string, readonly string[]>>, suffixes?: readonly string[], origin?: string, fetchImpl?: typeof fetch, now?: Date}} [opts]
 */
export async function auditCoverKeys({inventory = COVER_KEYS, suffixes = COVER_SUFFIXES, origin = COVER_ORIGIN, fetchImpl = fetch, now = new Date()} = {}) {
  const focus = await readFocusSuppression(origin, fetchImpl, now)
  const base = {focus, rows: [], mismatches: [], unjudged: [], control: null, listedJudged: 0}
  if (focus.state === 'SUPPRESSED') {
    return {...base, verdict: 'INDETERMINATE', reason: `covers are suppressed: ${focus.evidence}`}
  }

  const jobs = Object.keys(inventory).sort().flatMap((asin) =>
    suffixes.map((suffix) => ({asin, suffix, key: `${asin}${suffix}`, expected: inventory[asin]?.includes(suffix) ? 'present' : 'absent'}))
  )
  jobs.push({asin: null, suffix: null, key: CONTROL_KEY, expected: 'absent', control: true})
  const rows = new Array(jobs.length)
  let next = 0
  async function worker() {
    while (next < jobs.length) {
      const i = next++
      const job = jobs[i]
      let result
      try {
        result = await probeKey(`${origin}${job.key}`, fetchImpl)
      } catch (err) {
        result = {error: err instanceof Error ? `${err.name}: ${err.message}` : String(err)}
      }
      const judged = judgeKey(result)
      const kind = judged.answer === 'unjudged' ? 'unjudged' : judged.answer === job.expected ? 'ok' : 'mismatch'
      rows[i] = {...job, kind, got: judged.answer === 'unjudged' ? judged.why : judged.answer}
    }
  }
  await Promise.all(Array.from({length: Math.min(CONCURRENCY, jobs.length)}, worker))

  const control = rows.find((r) => r.control)
  const keyRows = rows.filter((r) => !r.control)
  const mismatches = keyRows.filter((r) => r.kind === 'mismatch')
  const unjudged = keyRows.filter((r) => r.kind === 'unjudged')
  const listedJudged = keyRows.filter((r) => r.expected === 'present' && r.kind !== 'unjudged').length
  const result = {...base, rows: keyRows, mismatches, unjudged, control, listedJudged}

  if (control.kind !== 'ok') {
    return {...result, verdict: 'INDETERMINATE', reason: `negative control ${CONTROL_KEY} answered ${control.got}, not absent`}
  }
  if (unjudged.length > 0) {
    return {...result, verdict: 'INDETERMINATE', reason: `${unjudged.length} key(s) could not be judged`}
  }
  if (listedJudged === 0) {
    return {...result, verdict: 'INDETERMINATE', reason: 'no listed key was judged, so nothing confirms a present cover'}
  }
  if (mismatches.length > 0) {
    return {...result, verdict: 'MISMATCH', reason: `${mismatches.length} key(s) differ from COVER_KEYS`}
  }
  return {...result, verdict: 'PASS', reason: 'every key answered as COVER_KEYS says'}
}

/** The report text for one audit result. */
export function formatReport({verdict, reason, focus, rows, mismatches, unjudged, control, listedJudged}) {
  const asins = new Set(rows.map((r) => r.asin)).size
  const lines = [`D7 cover inventory — ${rows.length} key(s) across ${asins} ASIN(s) in COVER_KEYS`, `  focus: ${focus.state} (${focus.evidence})`]
  if (control) {
    lines.push(`  negative control ${CONTROL_KEY}: ${control.got}; listed keys judged: ${listedJudged}`)
  }
  for (const r of mismatches) {
    lines.push(`  MISMATCH       ${r.asin} ${r.suffix}: expected ${r.expected}, got ${r.got} (${r.key})`)
  }
  for (const r of unjudged) {
    lines.push(`  INDETERMINATE  ${r.asin} ${r.suffix}: expected ${r.expected}, got ${r.got} (${r.key})`)
  }
  lines.push(`D7 verdict: ${verdict} — ${reason}`)
  return lines.join('\n')
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const result = await auditCoverKeys()
  console.log(formatReport(result))
  if (result.verdict !== 'PASS' && process.env.GITHUB_ACTIONS === 'true') {
    console.log(`::warning title=D7 cover inventory ${result.verdict}::${result.reason}`)
  }
  if (process.argv.includes('--check')) {
    process.exit(result.verdict === 'MISMATCH' ? 1 : result.verdict === 'INDETERMINATE' ? 2 : 0)
  }
  process.exit(0)
}

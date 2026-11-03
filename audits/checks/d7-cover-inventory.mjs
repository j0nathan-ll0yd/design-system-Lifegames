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
 * For every ASIN in COVER_KEYS this sends HEAD to all six derivative keys and
 * expects 200 for each listed suffix and 403 for each omitted one (the distribution
 * answers 403, not 404, for a missing key). Verdicts:
 *
 *   PASS           every key answered as the snapshot says.
 *   MISMATCH       at least one key answered 200 where 403 was expected, or the
 *                  reverse. Each mismatch is named by ASIN and key.
 *   INDETERMINATE  at least one key could not be judged: a network error or timeout,
 *                  a status other than 200 or 403, or a focus-gate suppression
 *                  (`X-Source: cloudfront-proxy-suppressed`). An unreachable host is
 *                  INDETERMINATE, never PASS. Mismatches found alongside are still
 *                  reported.
 *
 * Egress: the self-hosted Linux fleet reaches CloudFront only from the `cfedge`
 * lane (ci-runners-private RUNNERS.md "CloudFront edges on their own lane"), so the
 * audit-ds.yml job carries that label.
 *
 * Report-only by default: exits 0 in all cases. `--check` exits 1 on MISMATCH and
 * 2 on INDETERMINATE.
 *
 * Usage:
 *   node audits/checks/d7-cover-inventory.mjs           — report
 *   node audits/checks/d7-cover-inventory.mjs --check   — exit non-zero on a finding
 */

import {pathToFileURL} from 'node:url'

import {COVER_KEYS, COVER_ORIGIN, COVER_SUFFIXES} from '../../packages/fixtures/src/cover-inventory.ts'

// Coverage declaration for the hub's A18 check (atlas decision 0145): metadata only,
// parsed statically. A literal array of literal objects, one `surfaceId` each.
export const ARTIFACTS = [{surfaceId: 'exported-images'}]

/** A plain, identifying User-Agent. No contact detail of any kind. */
export const USER_AGENT = 'lifegames-ds-audit-d7/1'
const TIMEOUT_MS = 10_000
const ATTEMPTS = 2
const CONCURRENCY = 6
const SUPPRESSED_SOURCE = 'cloudfront-proxy-suppressed'

/**
 * HEAD one key. Resolves `{status, suppressed}` on a response and `{error}` on a
 * network failure or timeout. Retries once on an error or a 5xx.
 * @param {string} url
 * @param {typeof fetch} fetchImpl
 */
export async function probeKey(url, fetchImpl = fetch) {
  let last = {error: 'not attempted'}
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    try {
      const res = await fetchImpl(url, {method: 'HEAD', redirect: 'manual', headers: {'User-Agent': USER_AGENT}, signal: AbortSignal.timeout(TIMEOUT_MS)})
      last = {status: res.status, suppressed: res.headers.get('x-source') === SUPPRESSED_SOURCE}
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
 * Probe every key of every inventoried ASIN and judge it against the snapshot.
 * @param {{inventory?: Readonly<Record<string, readonly string[]>>, suffixes?: readonly string[], origin?: string, probe?: (url: string) => Promise<{status?: number, suppressed?: boolean, error?: string}>}} [opts]
 */
export async function auditCoverKeys({inventory = COVER_KEYS, suffixes = COVER_SUFFIXES, origin = COVER_ORIGIN, probe = (url) => probeKey(url)} = {}) {
  const jobs = Object.keys(inventory).sort().flatMap((asin) =>
    suffixes.map((suffix) => ({asin, suffix, key: `${asin}${suffix}`, expected: inventory[asin]?.includes(suffix) ? 200 : 403}))
  )
  const rows = new Array(jobs.length)
  let next = 0
  async function worker() {
    while (next < jobs.length) {
      const i = next++
      const job = jobs[i]
      let result
      try {
        result = await probe(`${origin}${job.key}`)
      } catch (err) {
        result = {error: err instanceof Error ? `${err.name}: ${err.message}` : String(err)}
      }
      let outcome
      if (result.error !== undefined) {
        outcome = {kind: 'indeterminate', got: result.error}
      } else if (result.suppressed) {
        outcome = {kind: 'indeterminate', got: `${result.status} (${SUPPRESSED_SOURCE})`}
      } else if (result.status !== 200 && result.status !== 403) {
        outcome = {kind: 'indeterminate', got: String(result.status)}
      } else {
        outcome = {kind: result.status === job.expected ? 'ok' : 'mismatch', got: String(result.status)}
      }
      rows[i] = {...job, ...outcome}
    }
  }
  await Promise.all(Array.from({length: Math.min(CONCURRENCY, jobs.length)}, worker))

  const mismatches = rows.filter((r) => r.kind === 'mismatch')
  const indeterminate = rows.filter((r) => r.kind === 'indeterminate')
  let verdict = 'PASS'
  if (rows.length === 0 || indeterminate.length > 0) {
    verdict = 'INDETERMINATE'
  } else if (mismatches.length > 0) {
    verdict = 'MISMATCH'
  }
  return {verdict, rows, mismatches, indeterminate}
}

/** The report text for one audit result. */
export function formatReport({verdict, rows, mismatches, indeterminate}) {
  const asins = new Set(rows.map((r) => r.asin)).size
  const lines = [`D7 cover inventory — ${rows.length} key(s) across ${asins} ASIN(s) in COVER_KEYS`]
  if (rows.length === 0) {
    lines.push('  COVER_KEYS lists no ASIN: nothing was measured')
  }
  for (const r of mismatches) {
    lines.push(`  MISMATCH       ${r.asin} ${r.suffix}: expected ${r.expected}, got ${r.got} (${r.key})`)
  }
  for (const r of indeterminate) {
    lines.push(`  INDETERMINATE  ${r.asin} ${r.suffix}: expected ${r.expected}, got ${r.got} (${r.key})`)
  }
  lines.push(`D7 verdict: ${verdict}`)
  return lines.join('\n')
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const result = await auditCoverKeys()
  console.log(formatReport(result))
  if (process.argv.includes('--check')) {
    process.exit(result.verdict === 'MISMATCH' ? 1 : result.verdict === 'INDETERMINATE' ? 2 : 0)
  }
  process.exit(0)
}

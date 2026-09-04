#!/usr/bin/env node
// mantle-cli-output: WCAG-AA contrast gate report for stdout
// WCAG-AA contrast gate for Lifegames Design System tokens.
//
// Reads packages/tokens/dist/tokens.css, resolves overlay colors by
// alpha-compositing over surface-base, and asserts that each text/surface
// pairing meets the contrast threshold for its intended use.
//
// F-021/F-022: also covers accent-on-surface pairings (15 new) and prints
// an advisory APCA Lc column alongside the WCAG ratio. APCA is informational
// only — failures there are advisory; only WCAG ratio failures gate CI.
//
// Exits non-zero on any WCAG violation so it can wire into CI as a hard
// gate. Use --allow-fail <pairing-id> to whitelist specific
// known-acceptable failures (e.g. accent.amber-on-surface.base, where the
// vibrant amber is intentionally below 3:1 against deep backgrounds and
// is only used decoratively — never as text).
//
// `evaluateContrast({css, allowFail})` is exported so the known-answer suite
// (check-contrast.test.mjs) can feed the gate a synthetic stylesheet. The
// stylesheet is an explicit ARGUMENT, deliberately not an environment variable
// — same reasoning as check-swift-widget-purity.mjs. A missing tokens.css was
// already fail-closed (exit 2) and stays that way; the CSS path is resolved
// against this file rather than the PROCESS CWD, which is what `path.resolve`
// with a bare relative path used to do — running the gate from any other
// directory made it report "run pnpm build:tokens first" and exit 2.

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import {blend, formatHex, parse, wcagContrast} from 'culori'

const DEFAULT_ROOT = path.resolve(import.meta.dirname, '..', '..')
const CSS_REL = 'packages/tokens/dist/tokens.css'

/** Parse `--lg-*` custom-property declarations out of a stylesheet. */
function parseTokens(css) {
  const tokens = {}
  const DECL_RE = /^\s*(--lg-[\w-]+):\s*([^;]+);/gm
  let m
  while ((m = DECL_RE.exec(css))) {
    tokens[m[1]] = m[2].trim()
  }
  return tokens
}

function resolveOnSurfaceBase(tokens, name) {
  const raw = tokens[name]
  if (!raw) {
    throw new Error(`missing token: ${name}`)
  }
  const c = parse(raw)
  if (!c) {
    throw new Error(`culori cannot parse ${name}=${raw}`)
  }
  const alpha = c.alpha ?? 1
  if (alpha >= 1) {
    return c
  }
  const base = parse(tokens['--lg-color-surface-base'])
  if (!base) {
    throw new Error(`cannot parse --lg-color-surface-base`)
  }
  return blend([base, c], 'normal')
}

function resolveOpaque(tokens, name) {
  const raw = tokens[name]
  if (!raw) {
    throw new Error(`missing token: ${name}`)
  }
  const c = parse(raw)
  if (!c) {
    throw new Error(`culori cannot parse ${name}=${raw}`)
  }
  return c
}

// ── APCA Lc — advisory only ────────────────────────────────────────────────────
// Minimal APCA-W3 (SACSS-08) implementation: lightness contrast between
// foreground text and background surface. Range roughly -108..+108. Sign
// indicates polarity (positive = light text on dark; negative = dark on
// light). Magnitude rules of thumb (from APCA-W3 docs):
//   |Lc| >= 90  body text, any size
//   |Lc| >= 75  body text 16px+
//   |Lc| >= 60  large text / headings
//   |Lc| >= 45  large headlines only
//   |Lc| <  45  decorative / non-text only
// We render |Lc| so the reader can pattern-match against those rules
// without thinking about polarity.
function srgbToY({r, g, b}) {
  // sRGB EOTF (simple-IEC) with the small-value linear segment.
  const lin = (v) => Math.pow(v, 2.4)
  return 0.2126729 * lin(r) + 0.7151522 * lin(g) + 0.072175 * lin(b)
}
function apcaLc(textRgb, bgRgb) {
  const Yt = srgbToY(textRgb)
  const Yb = srgbToY(bgRgb)
  const BLACK_THRESHOLD = 0.022
  const BLACK_CLAMP = 1.414
  function clamp(Y) {
    return Y < BLACK_THRESHOLD ? Y + Math.pow(BLACK_THRESHOLD - Y, BLACK_CLAMP) : Y
  }
  const Ytc = clamp(Yt)
  const Ybc = clamp(Yb)
  if (Math.abs(Ytc - Ybc) < 0.0005) {
    return 0
  }
  let Sapc
  if (Ybc > Ytc) {
    // light bg, dark text → positive lc
    Sapc = (Math.pow(Ybc, 0.56) - Math.pow(Ytc, 0.57)) * 1.14
  } else {
    // dark bg, light text → negative lc
    Sapc = (Math.pow(Ybc, 0.65) - Math.pow(Ytc, 0.62)) * 1.14
  }
  let Lc = Sapc * 100
  // Reverse-polarity offset per APCA-W3
  if (Math.abs(Lc) < 7.5) {
    Lc = 0
  } else if (Lc > 0) {
    Lc -= 2.7
  } else {
    Lc += 2.7
  }
  return Lc
}
function culoriToSrgbObj(c) {
  // culori parsed colors carry r,g,b in 0..1 in sRGB by default for hex.
  return {r: c.r ?? 0, g: c.g ?? 0, b: c.b ?? 0}
}

// ── pairings ────────────────────────────────────────────────────────────────
// Each entry: text token, surface token, minimum WCAG-AA ratio, label.
// 4.5:1 = body text; 3:1 = large text / non-text UI (headings).
//
// F-021/F-022 — accent-on-surface (decorative + non-text UI):
//   5 accent foregrounds × 3 surfaces = 15 new pairings, all gated at 3:1
//   (the WCAG "non-text contrast" threshold for UI components). Demote
//   specific known-acceptable failures via --allow-fail.
const ACCENT_FGS = [
  '--lg-color-accent-pink',
  '--lg-color-accent-blue',
  '--lg-color-accent-green',
  '--lg-color-accent-amber',
  '--lg-color-accent-purple'
]
const ACCENT_SURFS = [
  '--lg-color-surface-base',
  '--lg-color-surface-raised',
  '--lg-color-surface-deep'
]
const ACCENT_PAIRINGS = ACCENT_FGS.flatMap((fg) => ACCENT_SURFS.map((surf) => [fg, surf, 3.0, 'accent/non-text UI']))

const PAIRINGS = [
  ['--lg-color-text-title', '--lg-color-surface-base', 3.0, 'large/heading'],
  ['--lg-color-text-title', '--lg-color-surface-deep', 3.0, 'large/heading'],
  ['--lg-color-text-title', '--lg-color-surface-raised', 3.0, 'large/heading'],
  ['--lg-color-text-primary', '--lg-color-surface-base', 4.5, 'body'],
  ['--lg-color-text-primary', '--lg-color-surface-deep', 4.5, 'body'],
  ['--lg-color-text-primary', '--lg-color-surface-raised', 4.5, 'body'],
  ['--lg-color-text-muted', '--lg-color-surface-base', 4.5, 'body'],
  ['--lg-color-text-muted', '--lg-color-surface-deep', 4.5, 'body'],
  ['--lg-color-text-muted', '--lg-color-surface-raised', 4.5, 'body'],
  ...ACCENT_PAIRINGS
]

function pairingId(textName, surfName) {
  // "--lg-color-accent-amber" → "accent.amber"
  const compact = (n) => n.replace(/^--lg-color-/, '').replace(/-/g, '.').replace(/\./, '.')
  return `${compact(textName)}-on-${compact(surfName)}`
}

/**
 * Evaluate every WCAG pairing against a stylesheet.
 *
 * @param {{css: string, allowFail?: Iterable<string>}} options
 * @returns {{results: object[], failures: object[], allowedFailCount: number, pairingCount: number}}
 */
export function evaluateContrast({css, allowFail = []}) {
  const tokens = parseTokens(css)
  const allowed = new Set(allowFail)
  const results = []
  const failures = []

  for (const [textName, surfName, min, kind] of PAIRINGS) {
    const text = resolveOpaque(tokens, textName)
    const surf = resolveOnSurfaceBase(tokens, surfName)
    const ratio = wcagContrast(text, surf)
    const lc = apcaLc(culoriToSrgbObj(text), culoriToSrgbObj(surf))
    const pass = ratio >= min
    const id = pairingId(textName, surfName)
    const allowedFail = !pass && allowed.has(id)
    results.push({id, textName, surfName, ratio, min, kind, pass, allowedFail, lc, surfHex: formatHex(surf)})
    if (!pass && !allowedFail) {
      failures.push({id, textName, surfName, ratio, min})
    }
  }

  return {results, failures, allowedFailCount: results.filter((r) => r.allowedFail).length, pairingCount: PAIRINGS.length}
}

export { PAIRINGS }

// Importing this module for the known-answer suite must not read tokens.css,
// print a report, or call process.exit.
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  // --allow-fail <id> [--allow-fail <id> ...] — pairing IDs to demote from
  // gating failure to advisory. Each ID is "{textRole}-on-{surfaceRole}",
  // e.g. "accent.amber-on-surface.base".
  const allowFail = new Set()
  const argv = process.argv.slice(2)
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--allow-fail' && argv[i + 1]) {
      allowFail.add(argv[i + 1])
      i++
    }
  }

  const cssPath = path.join(DEFAULT_ROOT, CSS_REL)
  if (!fs.existsSync(cssPath)) {
    console.error(`tokens.css not found at ${cssPath}. Run 'pnpm build:tokens' first.`)
    process.exit(2)
  }

  const {results, failures, allowedFailCount} = evaluateContrast({css: fs.readFileSync(cssPath, 'utf8'), allowFail})

  const colW = Math.max(...PAIRINGS.map(([t]) => t.length))
  const surW = Math.max(...PAIRINGS.map(([, s]) => s.length))

  console.log(`WCAG-AA contrast gate (${CSS_REL})`)
  console.log('APCA Lc shown as |Lc| (advisory only — does not gate)')
  console.log('─'.repeat(colW + surW + 50))
  for (const r of results) {
    const mark = r.pass ? '✓' : r.allowedFail ? '!' : '✗'
    const lcStr = `|Lc|=${Math.abs(r.lc).toFixed(1).padStart(5)}`
    console.log(
      `${mark} ${r.textName.padEnd(colW)}  on  ${r.surfName.padEnd(surW)} (${r.surfHex})  ` +
        `${r.ratio.toFixed(2).padStart(5)}:1  ${lcStr}  (≥${r.min}:1 ${r.kind})` +
        (r.allowedFail ? '  [--allow-fail]' : '')
    )
  }
  console.log('─'.repeat(colW + surW + 50))

  if (allowedFailCount) {
    console.log(`Note: ${allowedFailCount} pairing(s) below threshold are whitelisted via --allow-fail.`)
  }

  if (failures.length) {
    console.error(`\n${failures.length} violation(s) — fix the underlying tokens or whitelist via --allow-fail <id>.`)
    for (const f of failures) {
      console.error(`  ✗ ${f.id} → ${f.ratio.toFixed(2)}:1 (need ≥${f.min}:1)`)
    }
    process.exit(1)
  }

  console.log(`All ${results.length - allowedFailCount} gating pairings pass WCAG-AA${allowedFailCount ? ` (${allowedFailCount} whitelisted)` : ''}.`)
}

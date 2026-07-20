'use strict'

// P1 — Token-as-truth boundary (GOVERNANCE.md §3).
//
// Web DS widgets (packages/web/src/widgets/**) must encode color/value as
// tokens, never raw CSS hex literals. Raw hex bypasses the cross-platform
// parity guarantee that web and iOS resolve to identical values, and prevents
// theme/contrast governance scripts from reasoning about widget colors.
//
// What this rule flags:
//   - Hex color literals (#RGB, #RGBA, #RRGGBB, #RRGGBBAA) appearing in
//     string Literals or TemplateLiterals in JS/TS source.
//   - The same patterns appearing inside .astro / .css raw source text
//     (scanned via Program node when the parser exposes source text).
//
// Exemptions:
//   - Hex inside a `var(--lg-*, FALLBACK)` second argument — the CSS variable
//     fallback pattern is intentionally a literal because the var name is
//     already the canonical token reference. The fallback is a last-resort
//     visual safety net and is explicitly allowed.
//   - Standard ESLint `// eslint-disable-next-line lifegames-local/no-raw-hex-in-widgets`
//     and surrounding-block disables work out of the box via ESLint's normal
//     directive handling — no custom support needed.

const FILE_PATTERN = /\/packages\/web\/src\/widgets\/.+\.(?:astro|css|ts|tsx|js|jsx|mjs|cjs)$/

// #RGB, #RGBA, #RRGGBB, #RRGGBBAA — exactly 3, 4, 6, or 8 hex digits.
// Word boundary after to avoid swallowing into longer tokens.
// Negative lookbehind for `&` rules out HTML numeric character entities
// (`&#NNNN;`, `&#xNN;`) which share the `#NN..` prefix but are not CSS hex.
const HEX_RE = /(?<!&)#([0-9a-fA-F]{3,8})\b/g

// Width set we recognise as a real CSS color literal.
const VALID_HEX_LENGTHS = new Set([3, 4, 6, 8])

// Token-name fallback exemption: `var(--lg-..., #abc)` — match the fallback
// hex inside the second argument so we can subtract those spans before
// reporting violations.
const VAR_FALLBACK_RE = /var\(\s*--lg-[a-z0-9-]+\s*,\s*(#([0-9a-fA-F]{3,8}))\s*\)/g

function collectExemptHexSpans(text) {
  const spans = []
  let m
  VAR_FALLBACK_RE.lastIndex = 0
  while ((m = VAR_FALLBACK_RE.exec(text)) !== null) {
    const hexStart = m.index + m[0].indexOf(m[1])
    spans.push([hexStart, hexStart + m[1].length])
  }
  return spans
}

function isWithinSpan(offset, spans) {
  for (const [s, e] of spans) {
    if (offset >= s && offset < e) {
      return true
    }
  }
  return false
}

function scanText(text) {
  const exempt = collectExemptHexSpans(text)
  const hits = []
  let m
  HEX_RE.lastIndex = 0
  while ((m = HEX_RE.exec(text)) !== null) {
    const digits = m[1]
    if (!VALID_HEX_LENGTHS.has(digits.length)) {
      continue
    }
    if (isWithinSpan(m.index, exempt)) {
      continue
    }
    hits.push({index: m.index, hex: '#' + digits})
  }
  return hits
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {description: 'P1: web DS widgets must encode color via tokens, never raw hex literals (token-as-truth boundary)'},
    messages: {rawHex: 'Raw hex `{{hex}}` forbidden in widget code. Use `var(--lg-color-*)` or add a token (see GOVERNANCE.md P1).'},
    schema: []
  },
  create(context) {
    const filename = context.filename || context.getFilename()
    if (!FILE_PATTERN.test(filename)) {
      return {}
    }

    function reportLiteralHits(node, text) {
      const hits = scanText(text)
      for (const hit of hits) {
        context.report({node, messageId: 'rawHex', data: {hex: hit.hex}})
      }
    }

    // Try to read raw source text for Program-level scan. This handles .astro
    // and .css files, where the AST may not expose CSS/style content as
    // string Literals but the source text still contains the raw hex.
    function reportProgramSourceHits(programNode) {
      const sourceCode = context.sourceCode || context.getSourceCode()
      const text = sourceCode && sourceCode.text
      if (typeof text !== 'string' || text.length === 0) {
        return
      }
      const hits = scanText(text)
      for (const hit of hits) {
        // Map offset back to {line, column} for accurate reporting.
        const loc = sourceCode.getLocFromIndex
          ? sourceCode.getLocFromIndex(hit.index)
          : {line: 1, column: hit.index}
        context.report({
          node: programNode,
          loc: {start: loc, end: {line: loc.line, column: loc.column + hit.hex.length}},
          messageId: 'rawHex',
          data: {hex: hit.hex}
        })
      }
    }

    // For .astro/.css the AST may be effectively empty (parser falls back to
    // a stub Program). For .ts/.tsx/.js/.jsx we still want literal-level
    // reports so the AI / IDE sees node-anchored diagnostics. We do BOTH and
    // dedupe by (line, column, hex) to avoid double-reporting the same hex
    // when it appears both as a Literal and in raw source text.
    const seen = new Set()
    function dedupedReport(node, hex, loc) {
      const key = `${loc.line}:${loc.column}:${hex}`
      if (seen.has(key)) {
        return
      }
      seen.add(key)
      context.report({node, loc, messageId: 'rawHex', data: {hex}})
    }

    function programScan(programNode) {
      const sourceCode = context.sourceCode || context.getSourceCode()
      const text = sourceCode && sourceCode.text
      if (typeof text !== 'string' || text.length === 0) {
        return
      }
      const hits = scanText(text)
      for (const hit of hits) {
        const start = sourceCode.getLocFromIndex
          ? sourceCode.getLocFromIndex(hit.index)
          : {line: 1, column: hit.index}
        const end = {line: start.line, column: start.column + hit.hex.length}
        dedupedReport(programNode, hit.hex, {start, end})
      }
    }

    return {
      Program: programScan,
      Literal(node) {
        if (typeof node.value !== 'string') {
          return
        }
        const hits = scanText(node.value)
        if (!hits.length) {
          return
        }
        // Use the node's own loc — finer-grained than program source scan
        // and matches what other rules in this repo do for string literals.
        for (const hit of hits) {
          dedupedReport(node, hit.hex, node.loc)
        }
      },
      TemplateLiteral(node) {
        for (const quasi of node.quasis) {
          const hits = scanText(quasi.value.raw)
          if (!hits.length) {
            continue
          }
          for (const hit of hits) {
            dedupedReport(quasi, hit.hex, quasi.loc)
          }
        }
      }
    }
  }
}

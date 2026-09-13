#!/usr/bin/env node
/**
 * DTCG 2025.10 conformance validator.
 *
 * Validates every tokens/**\/*.tokens.json source file and every emitted
 * packages/tokens/dist/*.dtcg.json artifact against the DTCG 2025.10 spec
 * normative rules. Produces docs/dtcg-audit.md.
 *
 * Usage:
 *   pnpm dtcg:validate          — writes docs/dtcg-audit.md, exits non-zero on violations
 *   pnpm dtcg:validate --report — writes report only, exits 0 even on violations (for CI artifact)
 *
 * EXCLUSIONS: tokens/projections/** is NOT validated (projection mapping tables, not DTCG tokens).
 *
 * `validateDtcg({root})` is exported so the known-answer suite
 * (validate-dtcg.test.mjs) can point the validation at a temp fixture tree. The
 * root is an explicit ARGUMENT, deliberately not an environment variable — same
 * reasoning as check-swift-widget-purity.mjs.
 *
 * AN EMPTY SOURCE CORPUS IS A VIOLATION. `walk()` returns `[]` for a directory
 * that does not exist, so a renamed `tokens/` tree, or a filename convention that
 * drifted off `*.tokens.json`, left the validator walking ZERO files, finding zero
 * violations and exiting 0. Conformance over an empty set is not conformance. The
 * dist corpus is deliberately NOT held to this: `packages/tokens/dist` is a build
 * artifact and the validator legitimately runs before it exists.
 */

import fs from 'node:fs'
import path from 'node:path'
import * as prettier from 'prettier'

const DEFAULT_ROOT = path.resolve(import.meta.dirname, '..', '..')

const VALID_TYPES = new Set([
  'color',
  'dimension',
  'fontFamily',
  'fontWeight',
  'duration',
  'cubicBezier',
  'number',
  'string',
  'boolean',
  'null',
  'shadow',
  'typography',
  'transition',
  'gradient',
  'strokeStyle',
  'border',
  'composite'
])

// ── file collection ───────────────────────────────────────────────────────────
function walk(dir, ext) {
  const results = []
  if (!fs.existsSync(dir)) {
    return results
  }
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...walk(full, ext))
    } else if (entry.name.endsWith(ext)) {
      results.push(full)
    }
  }
  return results
}

// ── violation types ───────────────────────────────────────────────────────────
/**
 * @typedef {{ file: string, path: string, rule: string, detail: string }} Violation
 */

/**
 * @param {Record<string, unknown>} obj
 * @param {string} filePath
 * @param {string} currentPath
 * @param {string | null} inheritedType
 * @param {Violation[]} violations
 */
function walkTokens(obj, filePath, currentPath, inheritedType, violations, root) {
  const relFile = path.relative(root, filePath)

  // Check for bare 'value' or 'type' keys (deprecated pre-spec syntax)
  if ('value' in obj) {
    violations.push({file: relFile, path: currentPath, rule: 'BARE_VALUE_KEY', detail: 'Uses deprecated bare "value" key instead of "$value".'})
  }
  if ('type' in obj) {
    violations.push({file: relFile, path: currentPath, rule: 'BARE_TYPE_KEY', detail: 'Uses deprecated bare "type" key instead of "$type".'})
  }

  const isLeaf = '$value' in obj
  const localType = obj['$type']

  if (localType !== undefined && !VALID_TYPES.has(String(localType))) {
    violations.push({
      file: relFile,
      path: currentPath,
      rule: 'INVALID_TYPE',
      detail: `Unknown $type "${localType}". Valid types: ${[...VALID_TYPES].join(', ')}.`
    })
  }

  const effectiveType = localType ?? inheritedType

  if (isLeaf) {
    // Leaf token checks
    if (!effectiveType) {
      violations.push({file: relFile, path: currentPath, rule: 'MISSING_TYPE', detail: 'Token leaf has no $type (not set locally or inherited from group).'})
    }

    if (!('$description' in obj)) {
      violations.push({file: relFile, path: currentPath, rule: 'MISSING_DESCRIPTION', detail: 'Token leaf is missing $description.'})
    }

    // Check composite types: shadow, typography, transition, border
    // For shadow type: $value should be an object or array of shadow objects
    if (effectiveType === 'shadow' && obj['$value'] !== null) {
      const val = obj['$value']
      const shadows = Array.isArray(val) ? val : [val]
      for (const s of shadows) {
        if (typeof s === 'string') {
          continue // reference like {token.path}
        }
        if (typeof s === 'object' && s !== null) {
          const required = ['offsetX', 'offsetY', 'blur', 'color']
          for (const k of required) {
            if (!(k in s)) {
              violations.push({
                file: relFile,
                path: currentPath,
                rule: 'SHADOW_MISSING_FIELD',
                detail: `Shadow value missing required field "${k}". Required: offsetX, offsetY, blur, color.`
              })
              break
            }
          }
        }
      }
    }

    // For typography type: $value should be an object
    if (effectiveType === 'typography' && obj['$value'] !== null) {
      const val = obj['$value']
      if (typeof val === 'object' && !Array.isArray(val) && val !== null) {
        // DTCG typography composite fields
        const dtcgFields = ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing']
        const hasAny = dtcgFields.some((f) => f in val)
        // iOS scale metadata lives in $extensions.lifegames per DTCG convention.
        // Warn only if none of the standard DTCG fields are present in $value.
        if (!hasAny) {
          violations.push({
            file: relFile,
            path: currentPath,
            rule: 'TYPOGRAPHY_MISSING_FIELDS',
            detail: 'Typography composite $value has none of the standard DTCG fields: fontFamily, fontSize, fontWeight, lineHeight, letterSpacing.'
          })
        }
      } else if (typeof val !== 'string') {
        violations.push({
          file: relFile,
          path: currentPath,
          rule: 'TYPOGRAPHY_INVALID_VALUE',
          detail: 'Typography $value must be an object (composite) or a reference string.'
        })
      }
    }

    return // don't recurse into $value
  }

  // Group node — recurse into non-$ keys
  for (const [key, child] of Object.entries(obj)) {
    if (key.startsWith('$')) {
      continue
    }
    if (typeof child !== 'object' || child === null || Array.isArray(child)) {
      violations.push({
        file: relFile,
        path: `${currentPath}.${key}`,
        rule: 'INVALID_NODE',
        detail: `Expected object node but found ${Array.isArray(child) ? 'array' : typeof child}.`
      })
      continue
    }
    walkTokens(child, filePath, `${currentPath}.${key}`, effectiveType ?? null, violations, root)
  }
}

// ── run validation ────────────────────────────────────────────────────────────
/**
 * Validate every DTCG source and dist artifact under `root`.
 *
 * MISSING_DESCRIPTION is advisory; every other rule is a hard violation, as is an
 * empty source corpus.
 *
 * @param {{root?: string}} [options]
 * @returns {{violations: Violation[], hardViolations: Violation[], byRule: Record<string, Violation[]>, sourceFiles: string[], distFiles: string[]}}
 */
export function validateDtcg({root = DEFAULT_ROOT} = {}) {
  const sourceFiles = walk(path.join(root, 'tokens'), '.tokens.json').filter((f) => !f.includes(`${path.sep}projections${path.sep}`))
  const distFiles = walk(path.join(root, 'packages/tokens/dist'), '.dtcg.json')

  /** @type {Violation[]} */
  const violations = []

  if (sourceFiles.length === 0) {
    violations.push({
      file: 'tokens/',
      path: '(root)',
      rule: 'EMPTY_SOURCE_CORPUS',
      detail: 'No tokens/**/*.tokens.json source files were found — the validator would otherwise walk zero files and report conformance.'
    })
  }

  for (const filePath of [...sourceFiles, ...distFiles]) {
    let parsed
    try {
      parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    } catch (e) {
      violations.push({file: path.relative(root, filePath), path: '(root)', rule: 'PARSE_ERROR', detail: String(e)})
      continue
    }
    walkTokens(parsed, filePath, '(root)', null, violations, root)
  }

  const byRule = {}
  for (const v of violations) {
    ;(byRule[v.rule] ??= []).push(v)
  }

  return {violations, hardViolations: violations.filter((v) => v.rule !== 'MISSING_DESCRIPTION'), byRule, sourceFiles, distFiles}
}

/** Write docs/dtcg-audit.md and set the process exit code. */
async function main() {
  const REPORT_ONLY = process.argv.includes('--report')
  const ROOT = DEFAULT_ROOT
  const {violations: allViolations, hardViolations, byRule, sourceFiles, distFiles} = validateDtcg({root: ROOT})

  const totalViolations = allViolations.length
  const violationTypes = Object.keys(byRule).sort()

  const sourceCount = sourceFiles.length
  const distCount = distFiles.length

  let report = `# DTCG 2025.10 Conformance Audit Report

Spec reference: https://tr.designtokens.org/format/ (2025.10 stable)

## Summary

| Metric | Value |
|---|---|
| Source files validated | ${sourceCount} |
| Dist DTCG files validated | ${distCount} |
| Total violations | ${totalViolations} |
| Violation types | ${violationTypes.length} |

## Scope Exclusions

- \`tokens/projections/**\` — projection mapping tables (not DTCG tokens); explicitly excluded per plan.

## Violations by Rule

`

  if (totalViolations === 0) {
    report += `**All files pass DTCG 2025.10 conformance checks.**\n`
  } else {
    const ruleDescriptions = {
      BARE_VALUE_KEY: 'Deprecated bare `"value"` key (must use `"$value"`)',
      BARE_TYPE_KEY: 'Deprecated bare `"type"` key (must use `"$type"`)',
      INVALID_TYPE: 'Unknown `$type` value',
      MISSING_TYPE: 'Token leaf missing `$type` (not set locally or inherited)',
      MISSING_DESCRIPTION: 'Token leaf missing `$description`',
      SHADOW_MISSING_FIELD: 'Shadow composite missing required field',
      TYPOGRAPHY_MISSING_FIELDS: 'Typography composite missing standard DTCG fields',
      TYPOGRAPHY_INVALID_VALUE: 'Typography `$value` must be object or reference string',
      INVALID_NODE: 'Non-object node in token group position',
      PARSE_ERROR: 'JSON parse error'
    }

    for (const rule of violationTypes) {
      const entries = byRule[rule]
      const desc = ruleDescriptions[rule] ?? rule
      report += `### ${rule} — ${desc}\n\n`
      report += `${entries.length} occurrence(s)\n\n`
      report += `| File | Token Path | Detail |\n|---|---|---|\n`
      for (const v of entries.slice(0, 50)) {
        const detail = v.detail.replace(/\|/g, '\\|')
        report += `| \`${v.file}\` | \`${v.path}\` | ${detail} |\n`
      }
      if (entries.length > 50) {
        report += `| ... | ... | *(${entries.length - 50} more)* |\n`
      }
      report += '\n'
    }
  }

  report += `## Composite-Type Token Candidates

The following token groups use $type values that should be represented as
composite types per DTCG 2025.10 (typography, shadow, transition):

`

  // Identify composite candidates in source: already-typed composites are fine.
  // This section just lists what we found.
  const compositeCounts = {typography: 0, shadow: 0, transition: 0}
  for (const filePath of sourceFiles) {
    try {
      const src = fs.readFileSync(filePath, 'utf-8')
      if (src.includes('"typography"')) {
        compositeCounts.typography++
      }
      if (src.includes('"shadow"')) {
        compositeCounts.shadow++
      }
      if (src.includes('"transition"')) {
        compositeCounts.transition++
      }
    } catch (_) {}
  }

  report += `| Composite Type | Files Using It |\n|---|---|\n`
  for (const [type, count] of Object.entries(compositeCounts)) {
    report += `| \`${type}\` | ${count} |\n`
  }
  report += '\n'

  report += `## Files Validated

### Source token files (\`tokens/**/*.tokens.json\`, excluding projections)

${sourceFiles.map((f) => `- \`${path.relative(ROOT, f)}\``).join('\n')}

### Dist DTCG artifacts (\`packages/tokens/dist/*.dtcg.json\`)

${distFiles.length > 0 ? distFiles.map((f) => `- \`${path.relative(ROOT, f)}\``).join('\n') : '*(none found — run `pnpm build:tokens` to generate)*'}
`

  // ── write report ──────────────────────────────────────────────────────────────
  fs.mkdirSync(path.join(ROOT, 'docs'), {recursive: true})
  const auditPath = path.join(ROOT, 'docs/dtcg-audit.md')
  const auditPrettierCfg = await prettier.resolveConfig(auditPath)
  const formattedReport = await prettier.format(report, {...auditPrettierCfg, parser: 'markdown', filepath: auditPath})
  fs.writeFileSync(auditPath, formattedReport)
  console.log(`Wrote docs/dtcg-audit.md`)

  // ── print summary ─────────────────────────────────────────────────────────────
  console.log('')
  console.log('DTCG 2025.10 Conformance Audit')
  console.log('==============================')
  console.log(`Source files:  ${sourceCount}`)
  console.log(`Dist files:    ${distCount}`)
  console.log(`Violations:    ${totalViolations}`)
  if (totalViolations > 0) {
    for (const rule of violationTypes) {
      console.log(`  ${rule}: ${byRule[rule].length}`)
    }
  }
  console.log('')

  // ── exit code ─────────────────────────────────────────────────────────────────
  // MISSING_DESCRIPTION is advisory (many tokens legitimately lack it).
  // Only hard-fail on structural violations.
  if (!REPORT_ONLY && totalViolations > 0) {
    if (hardViolations.length > 0) {
      console.error(`ERROR: ${hardViolations.length} hard DTCG conformance violation(s). See docs/dtcg-audit.md for details.`)
      process.exit(1)
    } else {
      console.warn(`WARN: ${totalViolations} advisory violation(s) (MISSING_DESCRIPTION only). See docs/dtcg-audit.md.`)
    }
  } else if (totalViolations === 0) {
    console.log('All files pass DTCG 2025.10 conformance checks.')
  }
}

// Importing this module for the known-answer suite must not write a report or
// call process.exit.
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  await main()
}

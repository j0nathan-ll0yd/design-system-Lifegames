#!/usr/bin/env node
/* audit-inline-scripts.mjs -- DS-side CSP inline-JS gate (Plan #07 sibling).
 *
 * The web consumer (web-Lifegames-Portal) ships production CSP `script-src
 * 'self'` -- no 'unsafe-inline', no 'unsafe-hashes'. DS owns the widgets the
 * web repo sources via @lifegames/web/production, so inline JS introduced here
 * would be blocked at runtime downstream. This gate stops re-introduction at
 * the source by scanning the DS web package widgets for the three patterns the
 * CSP rejects:
 *
 *   1. `<script ... is:inline>...body...</script>` -- Astro emits the body
 *      verbatim inline, so the browser blocks it. A `<script is:inline
 *      src="...">` reference is FINE (external 'self' file, no body).
 *   2. `define:vars` -- Astro serializes these into an inline <script> the
 *      browser blocks under script-src 'self'.
 *   3. Inline HTML event-handler attributes (`onclick="..."`, `onerror="..."`)
 *      in markup -- blocked without 'unsafe-hashes'. Only the HTML-attribute
 *      form is flagged (a quote immediately after `=`); JS property assignment
 *      like `el.onclick = fn` is not a CSP issue and is ignored.
 *
 * EXEMPT (not CSP violations, not flagged):
 *   - Bundled module scripts: `<script>` without `is:inline`. Astro bundles
 *     these into hashed assets served from 'self'.
 *   - External references: any `<script ... src="...">`.
 *   - Data scripts: `type="application/ld+json"` / `type="application/json"`.
 *
 * Mirrors web-Lifegames-Portal/scripts/audit-inline-scripts.mjs. Uses only
 * Node built-ins (no glob dependency) so it runs anywhere `node` does. */
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

var here = path.dirname(fileURLToPath(import.meta.url))
var webRoot = path.resolve(here, '..')
var SRC_DIR = path.join(webRoot, 'src')

function walk(dir, out) {
  var entries = fs.readdirSync(dir, {withFileTypes: true})
  for (var e = 0; e < entries.length; e++) {
    var entry = entries[e]
    if (entry.name === 'node_modules') {
      continue
    }
    var full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(full, out)
    } else if (/\.(astro|html)$/.test(entry.name)) {
      out.push(full)
    }
  }
  return out
}

// Matches a full <script ...> ... </script> element (open tag captured in g1).
var SCRIPT_BLOCK_RE = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi

/* Inline HTML event-handler attribute. A quote MUST immediately follow `=` so
 * we match the HTML-attribute form `onerror="..."` while ignoring JS property
 * assignment like `el.onclick = fn` / `this.onerror = null`. */
var INLINE_HANDLER_RE = /\bon[a-z]+=["']/i

/* Astro `define:vars` is a template directive on <script>/<style> that
 * serializes server values into an inline <script>. Match the directive form
 * `define:vars=` (with assignment) so prose mentions of the words in comments
 * (e.g. "the old define:vars bridge") are not flagged. */
var DEFINE_VARS_RE = /\bdefine:vars\s*=/

/* Astro component frontmatter is fenced by leading `---` ... `---`. It is
 * server-only TypeScript, never emitted to the client, so markup-pattern scans
 * (handlers, define:vars directives) must skip it. Returns the template body
 * (everything after the closing fence) or the whole file if unfenced. */
function stripFrontmatter(content) {
  if (!/^---\r?\n/.test(content)) {
    return content
  }
  var close = content.indexOf('\n---', 3)
  if (close === -1) {
    return content
  }
  var nl = content.indexOf('\n', close + 1)
  return nl === -1 ? '' : content.slice(nl + 1)
}

function isDataScript(openTag) {
  return /\btype\s*=\s*["'](application\/(ld\+json|json))["']/i.test(openTag)
}

function hasSrc(openTag) {
  return /\bsrc\s*=/.test(openTag)
}

function isInline(openTag) {
  return /\bis:inline\b/.test(openTag)
}

function lineAt(content, index) {
  return content.slice(0, index).split('\n').length
}

var files = fs.existsSync(SRC_DIR) ? walk(SRC_DIR, []) : []
var violations = 0

for (var f = 0; f < files.length; f++) {
  var file = files[f]
  var rel = path.relative(webRoot, file)
  var content = fs.readFileSync(file, 'utf-8')

  // 1. Inline <script is:inline> WITH a non-empty body (no src, not data).
  var m
  SCRIPT_BLOCK_RE.lastIndex = 0
  while ((m = SCRIPT_BLOCK_RE.exec(content)) !== null) {
    var openTag = m[1]
    var body = m[2]
    if (!isInline(openTag)) {
      continue // bundled scripts are exempt
    }
    if (hasSrc(openTag)) {
      continue // external reference is fine
    }
    if (isDataScript(openTag)) {
      continue // inert data, not script
    }
    if (!/\S/.test(body)) {
      continue // empty body
    }
    violations++
    console.error('✗ ' + rel + ':' + lineAt(content, m.index) + " -- <script is:inline> with body (CSP script-src 'self' blocks this).")
  }

  // 2/3. define:vars and inline event-handler attributes (line-scanned).
  // Scan only the template body (frontmatter is server-only TS, never emitted);
  // lineOffset re-maps reported line numbers back to the original file.
  var template = stripFrontmatter(content)
  var lineOffset = content.split('\n').length - template.split('\n').length
  var lines = template.split('\n')
  for (var i = 0; i < lines.length; i++) {
    if (DEFINE_VARS_RE.test(lines[i])) {
      violations++
      console.error('✗ ' + rel + ':' + (i + 1 + lineOffset) + ' -- define:vars (Astro emits an inline <script>; CSP blocks it).')
    }
    if (INLINE_HANDLER_RE.test(lines[i])) {
      violations++
      console.error('✗ ' + rel + ':' + (i + 1 + lineOffset) + ' -- inline event handler (CSP rejects onX="..." without \'unsafe-hashes\').')
    }
  }
}

if (violations > 0) {
  console.error('\n' + violations + ' inline-JS violation(s).')
  console.error("CSP downstream is script-src 'self'. Ship widgets scriptless;")
  console.error("runtime belongs in the consumer's external public/js/*.js file.")
  process.exit(1)
}

console.log('No inline-JS violations (' + files.length + ' files scanned)')

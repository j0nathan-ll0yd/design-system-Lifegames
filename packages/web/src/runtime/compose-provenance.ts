/**
 * Composes System Status provenance HTML from STRUCTURED copy: translatable
 * prose (`body`, with `{phKey}` ICU MF1 placeholders) plus structural link
 * `refs` (each a `{ label, href }` pair). Replaces the old markdown renderer;
 * separating translatable text from URLs keeps a TMS from ever seeing a URL and
 * lets each platform compose its own links (web anchors here, native links on iOS).
 *
 * Each `{phKey}` in `body` is replaced by an anchor built from `refs[phKey]`:
 *   composeProvenance('Powered by {feedly} daily.', {
 *     feedly: { label: 'Feedly', href: 'https://feedly.com' },
 *   })
 *   // → 'Powered by <a href="https://feedly.com" target="_blank" rel="noopener noreferrer">Feedly</a> daily.'
 *
 * All literal body text and every label/href is HTML-escaped — this is a
 * renderer, not a sanitizer, over single-author DS copy. Scheme guard: only
 * https: hrefs emit an anchor; a non-https href renders the escaped label as
 * plain text (no anchor). Unknown/absent placeholders are left as escaped
 * literal text.
 *
 * Output is byte-identical to the prior renderProvenance() markdown output for
 * the same content, so the web visual baselines and behavioral test stay green.
 */
export function composeProvenance(body: string, refs: Record<string, {label: string; href: string}>): string {
  const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  const placeholderRe = /\{([a-zA-Z0-9_]+)\}/g
  let result = ''
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = placeholderRe.exec(body)) !== null) {
    result += escape(body.slice(lastIndex, match.index))
    // Capture group 1 is always present when this regex matches (it is not optional).
    const key = match[1] ?? ''
    const ref = refs[key]
    if (ref === undefined) {
      // Unknown/absent placeholder → escaped literal text (e.g. "{foo}").
      result += escape(match[0])
    } else if (ref.href.startsWith('https://')) {
      result += `<a href="${escape(ref.href)}" target="_blank" rel="noopener noreferrer">${escape(ref.label)}</a>`
    } else {
      // Scheme guard: non-https href → escaped label as plain text, no anchor.
      result += escape(ref.label)
    }
    lastIndex = placeholderRe.lastIndex
  }

  result += escape(body.slice(lastIndex))
  return result
}

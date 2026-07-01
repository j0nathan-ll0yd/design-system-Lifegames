/**
 * Converts trusted [label](https://...) markdown from @lifegames/copy to anchor HTML.
 *
 * Input is single-author DS copy (same trust class as the existing
 * `set:html={line.value}` usage in SystemStatus.astro). This is a renderer,
 * not a sanitizer — the only guarantee is that [text](url) pairs become
 * anchors and all other content is HTML-escaped.
 *
 * Scheme guard: only https: hrefs emit as links; http: / javascript: / data:
 * fall through to escaped plain text (cheap defence against a future copy typo).
 *
 * @example
 *   renderProvenance('Powered by [Feedly](https://feedly.com) daily.')
 *   // → 'Powered by <a href="https://feedly.com" target="_blank" rel="noopener noreferrer">Feedly</a> daily.'
 */
export function renderProvenance(md: string): string {
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // Only match [label](https://...) — the https: constraint is the scheme guard.
  const linkRe = /\[([^\]]+)\]\((https:\/\/[^)]+)\)/g;
  let result = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = linkRe.exec(md)) !== null) {
    result += escape(md.slice(lastIndex, match.index));
    const label = match[1];
    const href = match[2];
    result += `<a href="${escape(href)}" target="_blank" rel="noopener noreferrer">${escape(label)}</a>`;
    lastIndex = linkRe.lastIndex;
  }

  result += escape(md.slice(lastIndex));
  return result;
}

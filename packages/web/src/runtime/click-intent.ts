// Click intent for widget enhancements that take a real link's click over.
/**
 * True for a click that a widget may take over: the primary button with no
 * modifier key. A keyboard Enter on a link fires such a click too. Every other
 * click (a middle click, or a meta, ctrl, shift or alt click) keeps the
 * browser's own action, so a link still opens in a new tab or window.
 */
export function isPlainPrimaryClick(e: MouseEvent): boolean {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey
}

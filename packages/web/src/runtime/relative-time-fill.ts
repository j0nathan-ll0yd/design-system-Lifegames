// The browser's relative-label writer (atlas decision 0164 D5). The server
// writes absolute UTC text in <time datetime data-relative>; this pass writes
// the relative label. The updaters call it on the markup they write, and the
// page calls it once on the server markup at load. Browser only.
import {isIsoDate, isRelativeStyle, relativeTimeLabel} from './relative-time'

/**
 * Writes the relative label into every `time[data-relative]` under `root`,
 * computed at `now` from the element's `datetime`. An element whose
 * `datetime` does not parse, or whose style is unknown, keeps its text.
 * Text that already matches is not rewritten. Browser only.
 */
export function fillRelativeTimes(root: ParentNode = document, now: number = Date.now()): void {
  root.querySelectorAll<HTMLTimeElement>('time[data-relative]').forEach((el) => {
    const style = el.dataset.relative
    const datetime = el.getAttribute('datetime')
    if (!isRelativeStyle(style) || !isIsoDate(datetime)) {
      return
    }
    const label = relativeTimeLabel(datetime, style, now)
    if (el.textContent !== label) {
      el.textContent = label
    }
  })
}

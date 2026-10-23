// Relative-time labels, written in the browser only (atlas decision 0164 D5,
// "stable bytes").
//
// The server writes an instant as absolute, locale-neutral UTC text inside
// <time datetime data-relative>: `2026-10-23 14:05 UTC`. That is the text a
// visitor without JavaScript sees, and it depends on the data alone, so the
// same data always composes to the same bytes. In the browser,
// fillRelativeTimes (./relative-time-fill) replaces that text with the
// relative label ("5m ago"). It is the only writer of relative text into
// widget markup. This module is pure and DOM-free: the adapters and the server
// import it.

/**
 * The relative label forms in use. Each keeps the wording its widget showed
 * before decision 0164:
 * - `compact`: weeks, days, hours, minutes ("3w ago", "2d ago", "5h ago", "4m ago").
 *   DevActivityLog and ReadingFeed.
 * - `long`: spelled weeks and days, then hours ("2 weeks ago", "1 day ago", "5h ago").
 *   StarredRepoList.
 * - `age`: days, hours, minutes, never below "0m ago". System Status.
 */
export type RelativeStyle = 'compact' | 'long' | 'age'

const RELATIVE_STYLES: ReadonlySet<string> = new Set<RelativeStyle>(['compact', 'long', 'age'])

/** True when `value` names a relative label form. */
export function isRelativeStyle(value: string | null | undefined): value is RelativeStyle {
  return typeof value === 'string' && RELATIVE_STYLES.has(value)
}

const MS_PER_MINUTE = 60_000

const ISO_DATE_PREFIX = /^\d{4}-\d{2}-\d{2}/

/** True when `iso` is a full ISO timestamp (date and time) that parses. */
export function isIsoTimestamp(iso: string | null | undefined): iso is string {
  return typeof iso === 'string' && iso.includes('T') && Number.isFinite(Date.parse(iso))
}

/** True when `iso` is an ISO date or timestamp that parses. */
export function isIsoDate(iso: string | null | undefined): iso is string {
  return typeof iso === 'string' && ISO_DATE_PREFIX.test(iso) && Number.isFinite(Date.parse(iso))
}

/**
 * Absolute, locale-neutral UTC text for an ISO timestamp: `YYYY-MM-DD HH:MM UTC`.
 * It reads no locale and no time zone, so every host renders the same text.
 * A value that is not a full timestamp is returned unchanged (a date-only
 * export value stays as the export wrote it).
 */
export function absoluteTimeText(iso: string): string {
  if (!isIsoTimestamp(iso)) {
    return iso
  }
  const utc = new Date(Date.parse(iso)).toISOString()
  return utc.slice(0, 10) + ' ' + utc.slice(11, 16) + ' UTC'
}

/** Compact relative age ("5m ago", "3h ago", "2d ago") of `iso` at `now`. */
export function formatAge(iso: string, now: number): string {
  const minutesAgo = Math.max(0, Math.floor((now - new Date(iso).getTime()) / MS_PER_MINUTE))
  const hoursAgo = Math.floor(minutesAgo / 60)
  const daysAgo = Math.floor(hoursAgo / 24)
  if (daysAgo > 0) {
    return daysAgo + 'd ago'
  }
  if (hoursAgo > 0) {
    return hoursAgo + 'h ago'
  }
  return minutesAgo + 'm ago'
}

function formatCompact(iso: string, now: number): string {
  const minutesAgo = Math.floor((now - new Date(iso).getTime()) / MS_PER_MINUTE)
  const hoursAgo = Math.floor(minutesAgo / 60)
  const daysAgo = Math.floor(hoursAgo / 24)
  const weeksAgo = Math.floor(daysAgo / 7)
  if (weeksAgo > 0) {
    return weeksAgo + 'w ago'
  }
  if (daysAgo > 0) {
    return daysAgo + 'd ago'
  }
  if (hoursAgo > 0) {
    return hoursAgo + 'h ago'
  }
  return minutesAgo + 'm ago'
}

function formatLong(iso: string, now: number): string {
  const hoursAgo = Math.floor((now - new Date(iso).getTime()) / (60 * MS_PER_MINUTE))
  const daysAgo = Math.floor(hoursAgo / 24)
  const weeksAgo = Math.floor(daysAgo / 7)
  if (weeksAgo > 0) {
    return `${weeksAgo} week${weeksAgo > 1 ? 's' : ''} ago`
  }
  if (daysAgo > 0) {
    return `${daysAgo} day${daysAgo > 1 ? 's' : ''} ago`
  }
  return `${hoursAgo}h ago`
}

/** The relative label of `iso` at `now` in `style`. */
export function relativeTimeLabel(iso: string, style: RelativeStyle, now: number): string {
  if (style === 'long') {
    return formatLong(iso, now)
  }
  if (style === 'age') {
    return formatAge(iso, now)
  }
  return formatCompact(iso, now)
}

/**
 * The `data-relative` value for a <time datetime>: `style` when `datetime` is
 * an ISO date or timestamp that parses, else undefined (Astro then omits the
 * attribute). StarredRepoList, ReadingFeed and System Status label a date-only
 * value too, as they did before decision 0164. DevActivityLog keeps a
 * date-only event as written: its callers pass a style only for a timestamp
 * (isIsoTimestamp).
 */
export function relativeAttr(datetime: string | null | undefined, style: RelativeStyle): RelativeStyle | undefined {
  return isIsoDate(datetime) ? style : undefined
}

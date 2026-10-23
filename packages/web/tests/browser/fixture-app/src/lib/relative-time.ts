// Props for the relative-time page (atlas decision 0164 D5): the four widgets
// that show an instant, rendered from the known-answer exports through
// toDashboardViewModels, as the composer renders them. The events carry
// timestamps (the known answer has date-only values), so every card has a
// <time data-relative>.
import {composeSystemLines, type DashboardExports, type DashboardViewModels, toDashboardViewModels} from '../../../../../src/runtime/view-models'

const FILES = import.meta.glob('../../../../../../fixtures/src/generated/*/ssrKnownAnswer.json', {eager: true, import: 'default'}) as Record<string, any>

/** The render clock: the known answer's `generatedAt`. */
export const RENDER_NOW = '2026-03-18T12:00:00.000Z'
/** The clock the page script fills the relative labels at: 90 minutes later. */
export const FILL_NOW = '2026-03-18T13:30:00.000Z'

function raw(dir: string): any {
  const hit = Object.entries(FILES).find(([path]) => path.endsWith(`/${dir}/ssrKnownAnswer.json`))
  if (!hit) {
    throw new Error(`fixture ${dir}/ssrKnownAnswer.json not found`)
  }
  return hit[1]
}

export function relativeTimeViewModels(): DashboardViewModels {
  const events = raw('github-events')
  const nowMs = Date.parse(RENDER_NOW)
  const exports: DashboardExports = {
    githubEvents: {
      data: {...events, events: events.events.map((e: any, i: number) => ({...e, date: new Date(nowMs - (5 + i * 30) * 60_000).toISOString()}))}
    },
    starredRepos: {data: raw('github-starred-repos')},
    articles: {data: raw('articles')}
  }
  const vm = toDashboardViewModels(exports, RENDER_NOW)
  const generatedAt = raw('health').generatedAt
  // System Status with every source reporting at the known answer's `generatedAt`.
  const timestamps = Object.fromEntries(
    ['health', 'sleep', 'books', 'articles', 'githubEvents', 'starredRepos', 'theatreReviews'].map((s) => [s, generatedAt])
  )
  return {...vm, systemStatus: {system: {lines: composeSystemLines(timestamps, RENDER_NOW)}}}
}

// Props for the scripts-off suite: every live widget in every state, built the
// same way the server page does (toDashboardViewModels) from the raw known-answer
// fixtures. Mirrors tests/server-render/states.test.ts `exportsFor`.
import {type DashboardExports, type DomainInput, toDashboardViewModels} from '../../../../../src/runtime/view-models'

const FILES = import.meta.glob('../../../../../../fixtures/src/generated/*/{ssrKnownAnswer,empty}.json', {eager: true, import: 'default'}) as Record<
  string,
  unknown
>

export const NOW = '2026-03-18T12:00:00.000Z'

const DOMAIN_DIRS = {
  focus: 'focus',
  health: 'health',
  sleep: 'sleep',
  workouts: 'workouts',
  githubEvents: 'github-events',
  starredRepos: 'github-starred-repos',
  articles: 'articles',
  books: 'books',
  theatreReviews: 'theatre-reviews'
} as const

export const WIDGETS = [
  {name: 'HeartRate', vm: 'heartRate'},
  {name: 'MovementRings', vm: 'movementRings'},
  {name: 'Hydration', vm: 'hydration'},
  {name: 'NightSummary', vm: 'nightSummary'},
  {name: 'Workouts', vm: 'workouts'},
  {name: 'DevActivityLog', vm: 'devActivityLog'},
  {name: 'StarredRepoList', vm: 'starredRepoList'},
  {name: 'ReadingFeed', vm: 'readingFeed'},
  {name: 'Bookshelf', vm: 'bookshelf'},
  {name: 'TheatreReviews', vm: 'theatreReviews'}
] as const

// A variant is a page. `-forced` passes live props plus a state override; a
// bare non-data state passes just the state (the page loader's shape).
export const VARIANTS = [
  'live',
  'stale',
  'empty',
  'unavailable',
  'suppressed',
  'loading',
  'unavailable-forced',
  'suppressed-forced',
  'loading-forced',
  'live-340',
  'stale-340'
] as const
export type Variant = (typeof VARIANTS)[number]

function raw(dir: string, variation: string): unknown {
  const hit = Object.entries(FILES).find(([path]) => path.endsWith(`/${dir}/${variation}.json`))
  if (!hit) {
    throw new Error(`fixture ${dir}/${variation}.json not found`)
  }
  return hit[1]
}

function exportsFor(variation: string): DashboardExports {
  const out: Record<string, DomainInput<any>> = {}
  for (const [domain, dir] of Object.entries(DOMAIN_DIRS)) {
    out[domain] = {data: raw(dir, variation) as any}
  }
  return out as DashboardExports
}

export function widthFor(variant: Variant): number {
  return variant.endsWith('-340') ? 340 : 380
}

export function propsFor(vmKey: string, variant: Variant): Record<string, unknown> {
  const source = variant === 'empty' ? 'empty' : 'ssrKnownAnswer'
  const vm = (toDashboardViewModels(exportsFor(source), NOW) as unknown as Record<string, Record<string, unknown>>)[vmKey]!
  const base = variant.replace(/-340$/, '')
  if (base === 'live' || base === 'empty') {
    return {...vm}
  }
  if (base === 'stale') {
    return {...vm, state: 'stale'}
  }
  const state = base.replace(/-forced$/, '')
  return base.endsWith('-forced') ? {...vm, state} : {state}
}

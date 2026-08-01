// Post-adapter display fixtures for the SystemStatus widget.
//
// System is a DS-authored display shape with NO raw LP export equivalent — it is
// not produced by any runtime adapter. Authored directly against `@j0nathan-ll0yd/schemas`
// `System` (authored/system.schema.json) and fed to the SSR shell via
// loadDashboardData. Runtime polling flips PENDING rows to OK as live data arrives.
import type {System} from '@j0nathan-ll0yd/schemas'
import {authored} from './branded'

const SOURCES = [
  'Health',
  'Sleep',
  'Location',
  'Books',
  'Articles',
  'Github Events',
  'Github Stars',
  'Theatre Reviews'
]

function line(key: string, value: 'OK' | 'PENDING'): System['lines'][number] {
  const tone = value === 'OK' ? 'green' : 'amber'
  return {key, value, dotClass: `sys-dot-${tone}`, valClass: `sys-val-${tone}`}
}

// Baseline SSR shell: every source PENDING (amber). This is the honest pre-poll
// state — the shell renders before any CloudFront data has arrived, and runtime
// polling flips rows to OK. Matches the prior hand-baked data/system.json.
export const baseline = authored<System>({lines: SOURCES.map((key) => line(key, 'PENDING'))})

// All sources healthy (green) — the fully-hydrated state for visual coverage.
export const empty = authored<System>({lines: SOURCES.map((key) => line(key, 'OK'))})

// Maximally populated: all sources OK (green) — the same as `empty` for this
// domain since System has only `lines` (required, no nullable/optional fields).
// The maximally-populated state IS all-green (every source reporting successfully).
export const full = authored<System>({lines: SOURCES.map((key) => line(key, 'OK'))})

export const systemPostAdapter = {baseline, empty, full}

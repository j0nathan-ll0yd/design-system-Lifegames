// Sleep-phase arithmetic. A phase the sleep export did not carry is null:
// missing, never 0 seconds (atlas decision 0160, H03).
export interface SleepPhases {
  rem: number | null // seconds
  deep: number | null // seconds
  core: number | null // seconds
  awake: number | null // seconds
}

/** Asleep time: the sum of the phases the export carried (awake excluded). */
export function computeTotalSleepSeconds(phases: SleepPhases): number {
  return (phases.rem ?? 0) + (phases.deep ?? 0) + (phases.core ?? 0)
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours}h ${minutes}m`
}

/** A phase duration, or '' when the export did not carry the phase. */
export function formatPhase(seconds: number | null): string {
  if (seconds == null) {
    return ''
  }
  if (seconds >= 3600) {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }
  const minutes = Math.floor(seconds / 60)
  return `${minutes}m`
}

/**
 * Each asleep phase's share of asleep time. Null for all three unless the
 * export carried deep, REM and core: a share of a partial total is invented.
 */
export function computeSleepPercentages(phases: SleepPhases): {deepPct: number | null; remPct: number | null; corePct: number | null} {
  if (phases.rem == null || phases.deep == null || phases.core == null) {
    return {deepPct: null, remPct: null, corePct: null}
  }
  const totalSleep = phases.rem + phases.deep + phases.core
  if (totalSleep === 0) {
    return {deepPct: 0, remPct: 0, corePct: 0}
  }
  return {
    deepPct: Math.round((phases.deep / totalSleep) * 100),
    remPct: Math.round((phases.rem / totalSleep) * 100),
    corePct: Math.round((phases.core / totalSleep) * 100)
  }
}

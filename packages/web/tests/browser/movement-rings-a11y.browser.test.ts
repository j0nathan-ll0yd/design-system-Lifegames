import axe from 'axe-core'
import {afterEach, describe, expect, it} from 'vitest'
import {updateMovementRings} from '../../src/runtime/updaters-movement'
import type {AdaptedHealth} from '../../src/runtime/adapters'

// The gap the served-site axe scan exposed (atlas decision 0102 move 5).
//
// MovementRings 3.2.0 put `aria-label` on the `.mv-rings` wrapper while
// `role="img"` sat on the child `<svg>`. An accessible name is computed for the
// element that CARRIES the role, and `aria-label` is prohibited on a bare div
// (implicit role=generic), so the ring group shipped to production with no
// accessible name at all — axe `svg-img-alt`, SERIOUS.
//
// Nothing in this repo could see it. There was no a11y suite here, so the only
// thing that caught it was a scan of the deployed consumer, one release too
// late. This suite is that missing gate, and it runs against the REAL rendered
// component (fetched from the built fixture app), not hand-written markup that
// could drift from what the widget actually emits.
//
// It lives in the browser suite because accessible-name computation is a real
// engine's job: jsdom does not implement accname, so a jsdom run could not tell
// a named ring group from an unnamed one — exactly the blindness that let the
// original defect through.

/**
 * The rules that police "an ARIA role carries a valid, present accessible name".
 * Deliberately a named set rather than the full ruleset: this fragment is mounted
 * without the design-system stylesheet, so contrast and landmark rules would
 * report on the harness rather than on the widget.
 */
const NAMING_RULES = [
  'svg-img-alt',
  'role-img-alt',
  'aria-prohibited-attr',
  'aria-allowed-attr',
  'aria-required-attr',
  'aria-valid-attr-value',
  'aria-roles'
]

const roots: HTMLElement[] = []

afterEach(() => {
  while (roots.length) {
    roots.pop()!.remove()
  }
})

function mount(html: string): HTMLElement {
  const root = document.createElement('div')
  document.body.append(root)
  root.innerHTML = html
  roots.push(root)
  return root
}

/** The MovementRings card exactly as the Astro component server-renders it. */
async function renderedWidget(): Promise<HTMLElement> {
  const response = await fetch('/__ssr-movement')
  expect(response.ok).toBe(true)
  const parsed = new DOMParser().parseFromString(await response.text(), 'text/html')
  const card = parsed.querySelector('#cardMovement')
  expect(card).not.toBeNull()
  return mount(card!.outerHTML)
}

async function auditNaming(root: HTMLElement): Promise<axe.AxeResults> {
  return axe.run(root, {runOnly: {type: 'rule', values: NAMING_RULES}})
}

/** `rule: target — message` per violating node, so a red run names the element. */
function describeViolations(results: axe.AxeResults): string[] {
  return results.violations.flatMap((violation) => violation.nodes.map((node) => `${violation.id}: ${node.target.join(' ')} — ${node.failureSummary ?? ''}`))
}

describe('MovementRings accessible naming, as the component actually renders it', () => {
  it('names the ring group on the element that carries role="img"', async () => {
    const root = await renderedWidget()
    const svg = root.querySelector('.mv-rings svg')!

    // The root fix, asserted structurally: one element holds BOTH.
    expect(svg.getAttribute('role')).toBe('img')
    expect(svg.getAttribute('aria-label')).toMatch(/Calories \d+%, Exercise \d+%, Stand \d+%/)

    // And the wrapper no longer carries a name it could never expose.
    expect(root.querySelector('.mv-rings')!.hasAttribute('aria-label')).toBe(false)
  })

  it('reports no naming violations for the rendered widget', async () => {
    const results = await auditNaming(await renderedWidget())
    expect(describeViolations(results)).toEqual([])
  })

  it('actually evaluated the rule that fired on the served site', async () => {
    // Guards the vacuous pass: if the ring group stopped rendering, or the rule
    // stopped matching, `violations` would be empty for the wrong reason. Both
    // image-naming rules must appear in `passes` with a real node behind them —
    // svg-img-alt for the ring <svg>, role-img-alt for the sun-arc track.
    const results = await auditNaming(await renderedWidget())
    const passed = new Map(results.passes.map((rule) => [rule.id, rule.nodes.length]))

    expect(passed.get('svg-img-alt')).toBeGreaterThan(0)
    expect(passed.get('role-img-alt')).toBeGreaterThan(0)
    expect(results.incomplete.map((rule) => rule.id)).not.toContain('svg-img-alt')
  })

  // ── the name has to stay true, not just exist ───────────────────────────────
  //
  // Naming the group fixed "no name". It did not fix "wrong name". The consuming
  // site is `output: 'static'`, so the SSR label above is frozen at BUILD time,
  // while `updateMovementRings` repaints the rings on every poll. The updater
  // rewrote the three rings and the centre `%` and left `aria-label` alone, so a
  // screen reader announced build-time percentages over live rings — a
  // confidently-wrong announcement, which is worse than the silence #247 fixed.

  /** The label the fixture server-renders: 380/500, 32/30, 9/12. */
  const SSR_LABEL = 'Calories 76%, Exercise 107%, Stand 75%'

  /**
   * The slice of `AdaptedHealth` `updateMovementRings` reads. Every other field
   * belongs to a sibling widget and is inert here, present only to satisfy the type.
   */
  function poll(quantities: Record<string, {value: number; unit: string}>): AdaptedHealth {
    return {
      date: '2026-01-01',
      quantities,
      derived: {totalCalories: 0, deepPct: 0, remPct: 0, corePct: 0},
      sleepScore: 0,
      sleepDurationFormatted: '',
      sleepPhaseFormatted: {},
      hydration: {waterOz: 0, caffeineMg: 0, waterMax: 0, caffeineMax: 0, waterRangeLo: 0, waterRangeHi: 0, caffeineRangeLo: 0, caffeineRangeHi: 0}
    }
  }

  /** Against the default goals (500 kcal / 30 min / 12 hr): 42%, 20%, 25%. */
  const LIVE_QUANTITIES = {
    activeEnergyBurned: {value: 210, unit: 'kcal'},
    exerciseTime: {value: 6, unit: 'min'},
    standHours: {value: 3, unit: 'count'},
    stepCount: {value: 1200, unit: 'count'},
    distanceWalkingRunning: {value: 900, unit: 'm'},
    flightsClimbed: {value: 2, unit: 'count'}
  }

  it('rewrites the ring-group name on a live poll, so the announced value tracks the rings', async () => {
    const root = await renderedWidget()
    const svg = root.querySelector('.mv-rings svg[role="img"]')!

    // The staleness premise, pinned: the build-time name is a DIFFERENT string from
    // the one the poll must produce. Without this the assertion below could pass on
    // markup the updater never touched.
    expect(svg.getAttribute('aria-label')).toBe(SSR_LABEL)

    updateMovementRings(poll(LIVE_QUANTITIES))

    // The rings moved, so the name must have moved with them. Reverting the
    // `setAttribute('aria-label', …)` in updaters-movement.ts reds exactly here,
    // reporting the frozen SSR string.
    expect(svg.getAttribute('aria-label')).toBe('Calories 42%, Exercise 20%, Stand 25%')

    // ...and it is the same element that carries the role — the invariant #247
    // established, re-checked after the client has written to the node.
    expect(svg.getAttribute('role')).toBe('img')
    expect(root.querySelector('.mv-rings')!.hasAttribute('aria-label')).toBe(false)
  })

  it('announces over-goal rings unclamped, exactly as the SSR label does', async () => {
    // The centre readout clamps to 100% because a ring cannot overdraw. The
    // announced value must NOT — the SSR label ships "Exercise 107%", and a
    // clamp here would quietly under-report a closed-and-then-some ring.
    const root = await renderedWidget()

    updateMovementRings(poll({...LIVE_QUANTITIES, exerciseTime: {value: 45, unit: 'min'}}))

    expect(root.querySelector('.mv-rings svg[role="img"]')!.getAttribute('aria-label')).toBe('Calories 42%, Exercise 150%, Stand 25%')
    expect(root.querySelector('#ringCenterPct')!.textContent).toBe('42%')
  })

  it('reports no naming violations after a live poll', async () => {
    // The updated name must still BE a valid accessible name. An empty string or a
    // dropped attribute would re-open `svg-img-alt` — this is the axe gate above,
    // re-run against the post-poll DOM rather than only the build-time DOM.
    const root = await renderedWidget()
    updateMovementRings(poll(LIVE_QUANTITIES))

    const results = await auditNaming(root)
    expect(describeViolations(results)).toEqual([])
    expect(results.passes.find((rule) => rule.id === 'svg-img-alt')?.nodes.length).toBeGreaterThan(0)
  })

  it('control: the pre-fix updater leaves the build-time name on live rings', async () => {
    // Proves the assertions above are not vacuous, the same way the 3.2.0 control
    // below does for the element-move. This is the shape that shipped — rings
    // repainted, name untouched — and it must still read as stale, or the
    // live-update assertion would pass no matter what the updater does.
    const root = await renderedWidget()
    const svg = root.querySelector('.mv-rings svg[role="img"]')!

    // Everything the pre-fix updater did to the ring group: geometry only.
    root.querySelector('#ringMove')!.setAttribute('stroke-dashoffset', '218.65')

    expect(svg.getAttribute('aria-label')).toBe(SSR_LABEL)
    expect(svg.getAttribute('aria-label')).not.toBe('Calories 42%, Exercise 20%, Stand 25%')
  })

  it('control: the 3.2.0 split-element markup still fails svg-img-alt', async () => {
    // Proves the assertions above are not vacuous. This is the shape that
    // shipped — label on the wrapper, role on the child — and the rule must
    // still catch it, or this suite would pass no matter what the widget emits.
    const results = await auditNaming(
      mount(
        '<div class="mv-rings" aria-label="Calories 76%, Exercise 107%, Stand 75%">' +
          '<svg viewBox="0 0 144 144" role="img"><circle cx="72" cy="72" r="60" /></svg>' +
          '</div>'
      )
    )

    expect(results.violations.map((violation) => violation.id)).toContain('svg-img-alt')
  })
})

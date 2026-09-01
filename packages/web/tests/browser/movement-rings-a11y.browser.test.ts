import axe from 'axe-core'
import {afterEach, describe, expect, it} from 'vitest'

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

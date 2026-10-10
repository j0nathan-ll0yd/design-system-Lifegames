/// <reference path="../../src/astro-shim.d.ts" />
// Final verification L8 on PR #289: the tinted backgrounds of three GitHub
// widgets, and their line counts.
//
// They appended a hex alpha to the colour (`${color}15`). With a var() colour
// that is invalid CSS, so the browser dropped the tint; with a hex colour it
// worked only for 6 digits. They now use color-mix(), pinned here, and render
// no "+0 -0" when the export carries no line counts.
import {experimental_AstroContainer as AstroContainer} from 'astro/container'
import {JSDOM} from 'jsdom'
import {beforeAll, describe, expect, it} from 'vitest'
import CommitTimeline from '../../src/widgets/github/CommitTimeline.astro'
import DevActivityCards from '../../src/widgets/github/DevActivityCards.astro'
import DevActivityTimeline from '../../src/widgets/github/DevActivityTimeline.astro'

let container: AstroContainer
beforeAll(async () => {
  container = await AstroContainer.create()
})

async function render(component: any, props: Record<string, unknown>): Promise<Document> {
  return new JSDOM(await container.renderToString(component, {props})).window.document
}

const GREEN = 'var(--lg-color-accent-green)'
const commit = {type: 'commit', repo: 'r', title: 't', date: '2h ago', hash: 'abc1234', additions: 12, deletions: 3}
const bare = {type: 'commit', repo: 'r', title: 't', date: '2h ago', hash: 'abc1234'}

// A hex alpha glued to a colour: `)15`, `)40`, or an 8-digit hex built from a 6-digit one.
const HEX_SUFFIX = /\)\d{2}\b|#[0-9a-fA-F]{6}\d{2}\b/

describe('tints use color-mix, never a hex suffix', () => {
  it('DevActivityCards: the icon background is 8% of the event colour', async () => {
    const doc = await render(DevActivityCards, {events: [commit]})
    const style = doc.querySelector('.gh-dac-icon')?.getAttribute('style') ?? ''
    expect(style).toContain(`background: color-mix(in srgb, ${GREEN} 8%, transparent)`)
    expect(style).not.toMatch(HEX_SUFFIX)
  })

  it('DevActivityTimeline: the badge background is 8% and its border 25% of the event colour', async () => {
    const doc = await render(DevActivityTimeline, {events: [commit]})
    const style = doc.querySelector('.gh-dat-badge')?.getAttribute('style') ?? ''
    expect(style).toContain(`background: color-mix(in srgb, ${GREEN} 8%, transparent)`)
    expect(style).toContain(`border-color: color-mix(in srgb, ${GREEN} 25%, transparent)`)
    expect(style).not.toMatch(HEX_SUFFIX)
  })

  it('CommitTimeline: the repo badge is 12.5% and its border 25% of the repo colour, hex or var()', async () => {
    for (const repoColor of ['#7c3aed', GREEN]) {
      const doc = await render(CommitTimeline, {commits: [{hash: 'abc1234', message: 'm', repo: 'r', date: '2h ago', repoColor}]})
      const styles = [...doc.querySelectorAll('[style]')].map((e) => e.getAttribute('style') ?? '').filter((s) => s.includes('border-color'))
      expect(styles, repoColor).toEqual([
        `background: color-mix(in srgb, ${repoColor} 12.5%, transparent); border-color: color-mix(in srgb, ${repoColor} 25%, transparent); color: ${repoColor};`
      ])
    }
  })
})

describe('no "+0 -0" for a commit without line counts', () => {
  it('DevActivityCards: the hash alone without counts, the counts when the export has them', async () => {
    const without = await render(DevActivityCards, {events: [bare]})
    expect(without.body.textContent).toContain('abc1234')
    expect(without.body.textContent).not.toMatch(/\+\d+\/-\d+/)
    const withCounts = await render(DevActivityCards, {events: [commit]})
    expect(withCounts.body.textContent).toContain('abc1234 +12/-3')
  })

  it('DevActivityTimeline: no count spans without counts, both with them', async () => {
    const without = await render(DevActivityTimeline, {events: [bare]})
    expect(without.querySelector('.gh-dat-hash')?.textContent).toBe('abc1234')
    expect(without.querySelector('.gh-dat-additions')).toBeNull()
    expect(without.querySelector('.gh-dat-deletions')).toBeNull()
    const withCounts = await render(DevActivityTimeline, {events: [commit]})
    expect(withCounts.querySelector('.gh-dat-additions')?.textContent).toBe('+12')
    expect(withCounts.querySelector('.gh-dat-deletions')?.textContent).toBe('-3')
  })
})

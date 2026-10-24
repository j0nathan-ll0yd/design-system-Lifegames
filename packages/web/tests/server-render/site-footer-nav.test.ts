/// <reference path="../../src/astro-shim.d.ts" />
// SiteFooterNav (atlas decision 0158 follow-on, plan is-agentic-developers-link), rendered
// through the Astro Container API and asserted on the parsed DOM: one named nav landmark, the
// links in the order given with their hrefs and labels, aria-current on the current link only,
// and no script. TextPage renders it in its footer (text-page.test.ts); the website's homepage
// mounts it on its own.
import {identity} from '@j0nathan-ll0yd/copy'
import {experimental_AstroContainer as AstroContainer} from 'astro/container'
import {JSDOM} from 'jsdom'
import {beforeAll, describe, expect, it} from 'vitest'
import SiteFooterNav from '../../src/components/SiteFooterNav.astro'

let container: AstroContainer

beforeAll(async () => {
  container = await AstroContainer.create()
})

// Prettier's .astro layout puts element content on its own lines; trim it as a browser does.
function text(el: Element | null | undefined): string | undefined {
  return el?.textContent?.replace(/\s+/g, ' ').trim()
}

async function renderHtml(props: Record<string, unknown>): Promise<string> {
  return container.renderToString(SiteFooterNav as never, {props})
}

async function render(props: Record<string, unknown>): Promise<Document> {
  return new JSDOM(await renderHtml(props)).window.document
}

const LINKS = [
  {href: '/about', label: 'About'},
  {href: '/contact', label: 'Contact'},
  {href: '/developers', label: 'Developers', current: true},
  {href: '/privacy', label: 'Privacy'}
]

describe('SiteFooterNav', () => {
  it('renders one nav landmark named by identity.navigation.siteNavLabel', async () => {
    const doc = await render({links: LINKS})

    const navs = doc.querySelectorAll('nav')
    expect(navs).toHaveLength(1)
    expect(navs[0]!.classList.contains('lg-site-footer-nav')).toBe(true)
    expect(identity.navigation.siteNavLabel).toBe('Site')
    expect(navs[0]!.getAttribute('aria-label')).toBe(identity.navigation.siteNavLabel)
  })

  it('takes an explicit accessible name over the copy default', async () => {
    const doc = await render({links: LINKS, label: 'Fixture label'})
    expect(doc.querySelector('nav')!.getAttribute('aria-label')).toBe('Fixture label')
  })

  it('renders the links as a list, in order, with matching hrefs and labels', async () => {
    const doc = await render({links: LINKS})

    const items = [...doc.querySelectorAll('nav > ul.lg-site-footer-nav-list > li.lg-site-footer-nav-item')]
    expect(items).toHaveLength(LINKS.length)
    const anchors = items.map((li) => {
      expect(li.children).toHaveLength(1)
      return li.firstElementChild!
    })
    expect(anchors.every((a) => a.matches('a.lg-site-footer-nav-link'))).toBe(true)
    expect(anchors.map((a) => [a.getAttribute('href'), text(a)])).toEqual(LINKS.map((l) => [l.href, l.label]))
  })

  it('puts aria-current="page" on the current link and on no other', async () => {
    const doc = await render({links: LINKS})
    const anchors = [...doc.querySelectorAll('nav a')]
    expect(anchors.map((a) => a.getAttribute('aria-current'))).toEqual([null, null, 'page', null])
  })

  it('puts aria-current on no link when none is current', async () => {
    const doc = await render({links: LINKS.map(({href, label}) => ({href, label}))})
    expect(doc.querySelectorAll('[aria-current]')).toHaveLength(0)
  })

  it('renders nothing for an empty list: no unnamed or empty landmark', async () => {
    const html = await renderHtml({links: []})
    expect(html.trim()).toBe('')
  })

  it('ships no script', async () => {
    const html = await renderHtml({links: LINKS})
    expect(html).not.toMatch(/<script\b/i)
    expect(html).not.toMatch(/\son[a-z]+=/i)
  })
})

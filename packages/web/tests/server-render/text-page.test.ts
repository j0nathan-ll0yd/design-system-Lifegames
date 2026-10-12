/// <reference path="../../src/astro-shim.d.ts" />
// TextPage and TextPageSection (atlas decision 0158), rendered through the Astro
// Container API and asserted on the parsed DOM: the card carries its heading and its
// body, optional parts render only when the consumer passes them, and the footer marks
// the current page. Whether the page scrolls is a layout question; the real-browser
// suite tests/browser/text-page.test.ts answers it.
import {experimental_AstroContainer as AstroContainer} from 'astro/container'
import {JSDOM} from 'jsdom'
import {beforeAll, describe, expect, it} from 'vitest'
import TextPage from '../../src/components/TextPage.astro'
import TextPageSection from '../../src/components/TextPageSection.astro'

let container: AstroContainer

beforeAll(async () => {
  container = await AstroContainer.create()
})

// Prettier's .astro layout puts element content on its own lines, so rendered text
// carries edge whitespace that a browser and the accessible-name computation both trim.
function text(el: Element | null | undefined): string | undefined {
  return el?.textContent?.replace(/\s+/g, ' ').trim()
}

async function render(component: unknown, props: Record<string, unknown>, slots: Record<string, string> = {}): Promise<Document> {
  const html = await container.renderToString(component as never, {props, slots})
  return new JSDOM(html).window.document
}

const LINKS = [
  {href: '/one', label: 'One'},
  {href: '/two', label: 'Two', current: true},
  {href: '/three', label: 'Three'}
]

describe('TextPage', () => {
  it('renders the heading as the h1 that names the card', async () => {
    const doc = await render(TextPage, {title: 'Fixture Title'}, {default: '<p>Fixture body</p>'})

    const main = doc.querySelector('main')!
    expect(main.id).toBe('main-content')
    expect(main.classList.contains('lg-text-page')).toBe(true)

    const h1s = doc.querySelectorAll('h1')
    expect(h1s).toHaveLength(1)
    expect(text(h1s[0])).toBe('Fixture Title')

    const card = main.querySelector('article.lg-text-page-card')!
    expect(card.getAttribute('aria-labelledby')).toBe(h1s[0]!.id)
  })

  it('renders the default slot inside the card body', async () => {
    const doc = await render(TextPage, {title: 'T'}, {default: '<p id="body-probe">Fixture body</p>'})

    const probe = doc.querySelector('.lg-text-page-card .lg-text-page-body > #body-probe')
    expect(text(probe)).toBe('Fixture body')
  })

  it('renders the lede before the body, and omits it when not passed', async () => {
    const withLede = await render(TextPage, {title: 'T', lede: 'Fixture lede'}, {default: '<p id="body-probe">B</p>'})
    const body = withLede.querySelector('.lg-text-page-body')!
    expect(body.firstElementChild?.className).toBe('lg-text-page-lede')
    expect(text(body.firstElementChild)).toBe('Fixture lede')

    const without = await render(TextPage, {title: 'T'})
    expect(without.querySelector('.lg-text-page-lede')).toBeNull()
  })

  it('wraps the meta slot under the heading, and omits the wrapper when the slot is empty', async () => {
    const withMeta = await render(TextPage, {title: 'T'}, {meta: 'Updated <time>July 2026</time>'})
    const meta = withMeta.querySelector('.lg-text-page-header > p.lg-text-page-meta')!
    expect(text(meta)).toBe('Updated July 2026')
    expect(text(meta.querySelector('time'))).toBe('July 2026')

    const without = await render(TextPage, {title: 'T'})
    expect(without.querySelector('.lg-text-page-meta')).toBeNull()
  })

  it('renders the back link and the page links, and marks only the current page', async () => {
    const doc = await render(TextPage, {title: 'T', back: {href: '/', label: 'Home'}, links: LINKS})

    const back = doc.querySelector('footer.lg-text-page-footer > a.lg-text-page-back')!
    expect(back.getAttribute('href')).toBe('/')
    expect(text(back)).toBe('Home')

    const nav = [...doc.querySelectorAll('footer nav a.lg-text-page-nav-link')]
    expect(nav.map((a) => [a.getAttribute('href'), text(a)])).toEqual([
      ['/one', 'One'],
      ['/two', 'Two'],
      ['/three', 'Three']
    ])
    expect(nav.map((a) => a.getAttribute('aria-current'))).toEqual([null, 'page', null])
  })

  it('renders no footer when there is no back link and no page link', async () => {
    const doc = await render(TextPage, {title: 'T'})
    expect(doc.querySelector('footer')).toBeNull()
  })

  it('renders a back link without an empty nav', async () => {
    const doc = await render(TextPage, {title: 'T', back: {href: '/', label: 'Home'}})
    expect(doc.querySelector('footer a.lg-text-page-back')).not.toBeNull()
    expect(doc.querySelector('footer nav')).toBeNull()
  })
})

describe('TextPageSection', () => {
  it('renders its heading as an h2 and its body in the slot', async () => {
    const doc = await render(TextPageSection, {heading: 'Fixture Heading'}, {default: '<p>Fixture paragraph</p>'})

    const section = doc.querySelector('section.lg-text-page-section')!
    expect(text(section.querySelector('h2.lg-text-page-section-heading'))).toBe('Fixture Heading')
    expect(text(section.querySelector('.lg-text-page-section-body > p'))).toBe('Fixture paragraph')
  })

  it('takes a fragment id and names the section by its heading id', async () => {
    const doc = await render(TextPageSection, {heading: 'API', id: 'api'})

    const section = doc.querySelector('section')!
    expect(section.id).toBe('api')
    expect(section.getAttribute('aria-labelledby')).toBe('api-heading')
    expect(section.hasAttribute('aria-label')).toBe(false)
    expect(text(doc.getElementById('api-heading'))).toBe('API')
  })

  it('names the section by aria-label when no id is passed', async () => {
    const doc = await render(TextPageSection, {heading: 'Who'})

    const section = doc.querySelector('section')!
    expect(section.hasAttribute('id')).toBe(false)
    expect(section.hasAttribute('aria-labelledby')).toBe(false)
    expect(section.getAttribute('aria-label')).toBe('Who')
    expect(section.querySelector('h2')!.hasAttribute('id')).toBe(false)
  })
})

import {afterEach, describe, expect, it} from 'vitest'
import {initBookModal} from '../../src/runtime/book-modal-init'
import {initImageFallbacks, PLACEHOLDER_IMAGE_SRC} from '../../src/runtime/image-utils'
import {initTheatreReviews} from '../../src/runtime/theatre-init'
import {updateBookshelf} from '../../src/runtime/updaters'
import {updateTheatreReviews} from '../../src/runtime/updaters-theatre'
import type {AdaptedBooks} from '../../src/runtime/adapters'
import type {TheatreReviewsExport} from '@j0nathan-ll0yd/portal-contract/schemas'

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

async function settled(img: HTMLImageElement, timeoutMs = 5000): Promise<void> {
  const deadline = performance.now() + timeoutMs
  while (performance.now() < deadline && !img.complete) {
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
}

async function assertPaintedPlaceholder(img: HTMLImageElement, timeoutMs = 5000): Promise<void> {
  const deadline = performance.now() + timeoutMs
  while (performance.now() < deadline && !(img.complete && img.naturalWidth > 0)) {
    await new Promise((resolve) => setTimeout(resolve, 25))
  }

  expect(img.currentSrc.endsWith(PLACEHOLDER_IMAGE_SRC)).toBe(true)
  expect(img.naturalWidth).toBeGreaterThan(0)
  expect(img.srcset).toBe('')
  expect(img.closest('picture')?.querySelectorAll('source') ?? []).toHaveLength(0)
}

function books(imageStatus: 403 | 404, withAvif: boolean): AdaptedBooks {
  const failure = `/__image-failure/${imageStatus}`
  return {
    books: [{
      title: `Updater ${imageStatus}`,
      author: 'Fixture',
      asin: `UPDATER-${imageStatus}`,
      status: 'reading',
      rating: null,
      progress: 20,
      link: 'https://example.test/book',
      mainImage: `${failure}.webp`,
      mainImageThumb: `${failure}-thumb.webp`,
      mainImageCard: `${failure}-card.webp`,
      mainImageAvif: withAvif ? `${failure}.avif` : null,
      mainImageThumbAvif: withAvif ? `${failure}-thumb.avif` : null,
      mainImageCardAvif: withAvif ? `${failure}-card.avif` : null,
      notes: null,
      finishedAt: null,
      startedAt: null
    }],
    bookMeta: {},
    statusLabels: {reading: 'Reading'},
    stats: {total: 1, reading: 1, completed: 0, upcoming: 0}
  }
}

function review(imageStatus: 403 | 404, withAvif: boolean): TheatreReviewsExport['reviews'][number] {
  const failure = `/__image-failure/${imageStatus}-theatre`
  return {
    title: `Theatre ${imageStatus}`,
    slug: `theatre-${imageStatus}`,
    url: 'https://example.test/review',
    author: 'Fixture',
    publishedAt: '2026-01-01',
    rating: 'A',
    ratingNumeric: 4,
    excerpt: 'Fixture',
    imageUrl: `${failure}.webp`,
    imageUrlAvif: withAvif ? `${failure}.avif` : null,
    imageUrlCard: withAvif ? `${failure}-card.webp` : null,
    imageUrlCardAvif: withAvif ? `${failure}-card.avif` : null,
    imageWidth: 95,
    imageHeight: 143
  }
}

describe('forced 403/404 fallback across the complete cover render chain', () => {
  it('recovers picture and bare covers from the rendered Bookshelf Astro component', async () => {
    const response = await fetch('/__ssr-bookshelf')
    expect(response.ok).toBe(true)
    const parsed = new DOMParser().parseFromString(await response.text(), 'text/html')
    const rendered = parsed.querySelector('#cardBooks')
    expect(rendered).not.toBeNull()
    const root = mount(rendered!.outerHTML)
    const images = Array.from(root.querySelectorAll<HTMLImageElement>('img'))
    expect(images).toHaveLength(2)

    await Promise.all(images.map((img) => settled(img)))
    images.forEach((img) => expect(img.naturalWidth).toBe(0))
    initImageFallbacks(root)

    await Promise.all(images.map((img) => assertPaintedPlaceholder(img)))
  })

  it('recovers a bare 404 cover from the full-rebuild updater branch', async () => {
    const root = mount('<div id="cardBooks"><div class="widget-body"><ul id="dashShelfRow"></ul></div></div>')
    updateBookshelf(books(404, false))
    await assertPaintedPlaceholder(root.querySelector('img')!)
  })

  it('recovers a picture 403 cover from the in-place updater branch', async () => {
    const root = mount('<div id="cardBooks"><div class="widget-body"><ul id="dashShelfRow"></ul></div></div>')
    updateBookshelf(books(404, false))
    updateBookshelf(books(403, true))
    await assertPaintedPlaceholder(root.querySelector('img')!)
  })

  it('arms an AVIF-only modal and recovers after open', async () => {
    const data = JSON.stringify({
      title: 'Modal 403',
      author: 'Fixture',
      asin: 'MODAL-403',
      status: 'reading',
      statusLabel: 'Reading',
      mainImage: null,
      mainImageAvif: '/__image-failure/403-modal.avif'
    }).replace(/'/g, '&#39;')
    const root = mount(
      `<div id="cardBooks"><button class="shelf-book" data-book='${data}'>Open</button></div>` +
        '<dialog id="bookDialog"><div id="bookModal"></div></dialog>'
    )

    initBookModal()
    root.querySelector<HTMLButtonElement>('.shelf-book')!.click()
    const img = root.querySelector<HTMLImageElement>('.book-modal-cover')!
    expect(img.dataset.fallback).toBe(PLACEHOLDER_IMAGE_SRC)
    await assertPaintedPlaceholder(img)
  })

  it('recovers a picture 403 poster from theatre init', async () => {
    const root = mount('<section><div class="tri-card"><span id="theatreCount"></span><div id="theatreRow"></div></div></section>')
    initTheatreReviews(root, {reviews: [review(403, true)], totalReviews: 1})
    await assertPaintedPlaceholder(root.querySelector('img')!)
  })

  it('recovers a bare 404 poster from theatre update', async () => {
    const root = mount('<div id="cardTheatreReviews"><span id="theatreCount"></span><div id="theatreRow"></div></div>')
    updateTheatreReviews({generatedAt: '2026-01-01T00:00:00Z', source: 'fixture', totalReviews: 1, reviews: [review(404, false)]})
    await assertPaintedPlaceholder(root.querySelector('img')!)
  })
})

// @vitest-environment jsdom
import {beforeEach, describe, expect, it} from 'vitest'
import {updateTheatreReviews} from '../../src/runtime/updaters-theatre'
import {CLOUDFRONT_BASE} from '../../src/runtime/constants'
import {widgets} from '@j0nathan-ll0yd/copy'
import type {TheatreReviewsExport} from '@j0nathan-ll0yd/portal-contract/schemas'

function makeExport(reviews: TheatreReviewsExport['reviews'] = []): TheatreReviewsExport {
  return {generatedAt: '2026-01-01T00:00:00Z', source: 'test', totalReviews: reviews.length, reviews}
}

function setup() {
  document.body.innerHTML = `
    <div id="cardTheatreReviews" class="is-loading">
      <span id="theatreCount"></span>
      <div id="theatreRow"></div>
    </div>
  `
}

describe('updateTheatreReviews', () => {
  beforeEach(setup)

  it('does not throw when card is missing', () => {
    document.body.innerHTML = ''
    expect(() => updateTheatreReviews(makeExport())).not.toThrow()
  })

  it('sets review count text', () => {
    updateTheatreReviews(makeExport([]))
    expect(document.getElementById('theatreCount')!.textContent).toBe('0 reviews')
  })

  it('removes is-loading when reviews is empty', () => {
    updateTheatreReviews(makeExport([]))
    expect(document.getElementById('cardTheatreReviews')!.classList.contains('is-loading')).toBe(false)
  })

  it('renders theatre cards with titles', () => {
    const reviews = [
      {
        title: 'Hamilton',
        slug: 'hamilton',
        url: 'https://example.com/hamilton',
        author: 'Jonathan',
        publishedAt: '2026-01-01',
        rating: 'A',
        ratingNumeric: 4,
        excerpt: 'Great show',
        imageUrl: null,
        imageWidth: null,
        imageHeight: null
      }
    ]
    updateTheatreReviews(makeExport(reviews))
    expect(document.getElementById('theatreRow')!.innerHTML).toContain('Hamilton')
  })

  it('renders grade badge for rated review', () => {
    const reviews = [
      {
        title: 'Wicked',
        slug: 'wicked',
        url: 'https://example.com/wicked',
        author: 'Jonathan',
        publishedAt: '2026-01-01',
        rating: 'B+',
        ratingNumeric: 3,
        excerpt: 'Fun',
        imageUrl: null,
        imageWidth: null,
        imageHeight: null
      }
    ]
    updateTheatreReviews(makeExport(reviews))
    expect(document.getElementById('theatreRow')!.innerHTML).toContain('theatre-grade')
    expect(document.getElementById('theatreRow')!.innerHTML).toContain('B+')
  })

  it('does not render grade badge when rating is null', () => {
    const reviews = [
      {
        title: 'No Grade',
        slug: 'no-grade',
        url: 'https://example.com/ng',
        author: 'Jonathan',
        publishedAt: '2026-01-01',
        rating: null,
        ratingNumeric: null,
        excerpt: 'Hmm',
        imageUrl: null,
        imageWidth: null,
        imageHeight: null
      }
    ]
    updateTheatreReviews(makeExport(reviews))
    expect(document.getElementById('theatreRow')!.innerHTML).not.toContain('theatre-grade')
  })

  it('renders localized image URL when imageUrl is a CloudFront URL', () => {
    const reviews = [
      {
        title: 'CF Show',
        slug: 'cf-show',
        url: 'https://example.com/cf',
        author: 'Jonathan',
        publishedAt: '2026-01-01',
        rating: 'A',
        ratingNumeric: 4,
        excerpt: 'Good',
        imageUrl: `${CLOUDFRONT_BASE}/images/theatre/cf-show.webp`,
        imageWidth: 95,
        imageHeight: 143
      }
    ]
    updateTheatreReviews(makeExport(reviews))
    const img = document.querySelector('#theatreRow img') as HTMLImageElement
    expect(img).not.toBeNull()
    expect(img.src).toContain('/images/theatre/cf-show.webp')
  })

  it('keeps poster images decorative and installs a CSP-safe fallback listener', () => {
    const original = `${CLOUDFRONT_BASE}/images/theatre/cf-show.webp`
    const reviews = [
      {
        title: 'CF Show',
        slug: 'cf-show',
        url: 'https://example.com/cf',
        author: 'Jonathan',
        publishedAt: '2026-01-01',
        rating: 'A',
        ratingNumeric: 4,
        excerpt: 'Good',
        imageUrl: original,
        imageUrlAvif: null,
        imageUrlCard: `${CLOUDFRONT_BASE}/images/theatre/cf-show-card.webp`,
        imageUrlCardAvif: null,
        imageWidth: 95,
        imageHeight: 143
      }
    ]

    updateTheatreReviews(makeExport(reviews))
    const img = document.querySelector('#theatreRow img') as HTMLImageElement
    expect(img.alt).toBe('')
    expect(img.outerHTML).not.toContain('onerror=')
    expect(img.dataset.fallback).toBe(original)

    img.dispatchEvent(new Event('error'))
    expect(img.srcset).toBe('')
    expect(img.src).toBe(original)
    expect(img.onerror).toBeNull()
  })

  it('removes is-loading after rendering reviews', () => {
    const reviews = [
      {
        title: 'Test Show',
        slug: 'test',
        url: 'https://example.com/test',
        author: 'Jonathan',
        publishedAt: '2026-01-01',
        rating: 'A-',
        ratingNumeric: 4,
        excerpt: 'Nice',
        imageUrl: null,
        imageWidth: null,
        imageHeight: null
      }
    ]
    updateTheatreReviews(makeExport(reviews))
    expect(document.getElementById('cardTheatreReviews')!.classList.contains('is-loading')).toBe(false)
  })
})

describe('updateTheatreReviews with widget-body DOM', () => {
  function setupWithBody() {
    document.body.innerHTML = `
      <div id="cardTheatreReviews" class="is-loading">
        <div class="widget-header"><a id="theatreCount"></a></div>
        <div class="widget-body"><div id="theatreRow" class="theatre-row"></div></div>
      </div>
    `
  }

  beforeEach(setupWithBody)

  it('renders widget-empty in widget-body and removes is-loading when reviews is empty', () => {
    updateTheatreReviews(makeExport([]))
    const empty = document.querySelector('#cardTheatreReviews .widget-body .widget-empty')
    expect(empty).not.toBeNull()
    expect(empty!.textContent).toBe(widgets.theatreReviews.empty)
    expect(document.getElementById('cardTheatreReviews')!.classList.contains('is-loading')).toBe(false)
  })

  it('sets header count to 0 reviews when reviews is empty', () => {
    updateTheatreReviews(makeExport([]))
    expect(document.getElementById('theatreCount')!.textContent).toBe('0 reviews')
  })

  it('recreates theatreRow and renders review title after empty-to-populated transition', () => {
    updateTheatreReviews(makeExport([]))
    const oneReview = [
      {
        title: 'Hamilton',
        slug: 'hamilton',
        url: 'https://example.com/hamilton',
        author: 'Jonathan',
        publishedAt: '2026-01-01',
        rating: 'A',
        ratingNumeric: 4,
        excerpt: 'Great show',
        imageUrl: null,
        imageUrlAvif: null,
        imageUrlCard: null,
        imageUrlCardAvif: null,
        imageWidth: null,
        imageHeight: null
      }
    ]
    expect(() => updateTheatreReviews(makeExport(oneReview))).not.toThrow()
    const row = document.getElementById('theatreRow')
    expect(row).not.toBeNull()
    expect(row!.innerHTML).toContain('Hamilton')
  })
})

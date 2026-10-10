import {widgets} from '@j0nathan-ll0yd/copy'
import {esc, safeHttpsUrl} from './html-utils'
import {imgFallbackAttrs, installImageFallbacks, PLACEHOLDER_IMAGE_SRC, sanitizeImageUrl} from './image-utils'
import {isSuppressedCard, renderWidgetEmpty, revealLiveData} from './updater-empty'
import type {TheatreReviewsExport} from '@j0nathan-ll0yd/portal-contract/schemas'

const GRADE_COLORS: Record<string, string> = {
  'A+': '#06d6a0',
  A: '#06d6a0',
  'A-': '#06d6a0',
  'B+': '#3a86ff',
  B: '#3a86ff',
  'B-': '#3a86ff',
  'C+': '#f59e0b',
  C: '#f59e0b',
  'C-': '#f59e0b',
  'D+': '#ff6b00',
  D: '#ff6b00',
  'D-': '#ff6b00',
  F: '#ef4444'
}

/** One theatre review as the card markup reads it (the export's review item). */
export type TheatreCardReview = Pick<
  TheatreReviewsExport['reviews'][number],
  'title' | 'url' | 'rating' | 'imageUrl' | 'imageUrlAvif' | 'imageUrlCard' | 'imageUrlCardAvif'
>

/**
 * Card markup for a list of reviews. The single source for the server-rendered
 * row (TheatreReviews.astro, `set:html`) and the live update below, so the two
 * can never drift (atlas decision 0160, D5). Every interpolated value is escaped
 * and every image URL passes the sanitizer.
 */
export function theatreCardsHtml(reviews: readonly TheatreCardReview[]): string {
  let html = ''
  reviews.forEach((r, i) => {
    const gradeColor = (r.rating && GRADE_COLORS[r.rating]) || ''
    // This markup ships in server HTML: only an https review link becomes an href.
    const href = safeHttpsUrl(r.url)
    html += `<a class="theatre-card"${href ? ` href="${esc(href)}"` : ''} target="_blank" rel="noopener noreferrer" style="animation-delay: ${i * 0.08}s">`
    html += `<div class="theatre-poster-wrap">`
    if (r.imageUrl || r.imageUrlAvif || r.imageUrlCardAvif) {
      // Runtime theatre posters never have committed same-origin copies.
      const posterUrl = sanitizeImageUrl(r.imageUrl, {onReject: 'omit'})
      const cardUrl = sanitizeImageUrl(r.imageUrlCard, {onReject: 'omit'})
      const cardAvif = sanitizeImageUrl(r.imageUrlCardAvif, {onReject: 'omit'})
      const posterAvif = sanitizeImageUrl(r.imageUrlAvif, {onReject: 'omit'})
      const displaySrc = cardUrl || posterUrl || PLACEHOLDER_IMAGE_SRC
      const avifSrcset = [cardAvif ? esc(cardAvif) + ' 1x' : '', posterAvif ? esc(posterAvif) + ' 2x' : ''].filter(Boolean).join(', ')
      const fallback = imgFallbackAttrs(displaySrc, avifSrcset.length > 0)
      const avifSrc = avifSrcset ? '<source srcset="' + avifSrcset + '" type="image/avif">' : ''
      let imgTag: string
      if (cardUrl) {
        // The 2x entry is emitted only when a real AVIF exists for it — a
        // non-AVIF URL inside type="image/avif" is chosen by the browser and
        // then fails to decode, with no <picture> fallback to recover it.
        imgTag = '<img src="' +
          esc(cardUrl) +
          '" srcset="' +
          esc(cardUrl) +
          ' 1x, ' +
          esc(posterUrl || displaySrc) +
          ' 2x" width="95" height="143" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer"' +
          fallback +
          '>'
      } else {
        imgTag = '<img src="' +
          esc(displaySrc) +
          '" width="95" height="143" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer"' +
          fallback +
          '>'
      }
      html += avifSrc ? '<picture>' + avifSrc + imgTag + '</picture>' : imgTag
    }
    if (r.rating) {
      html += `<span class="theatre-grade" style="color:${gradeColor};border-color:${gradeColor}">${esc(r.rating)}</span>`
    }
    html += `</div>`
    html += `<div class="theatre-title"><span>${esc(r.title)}</span></div>`
    html += '</a>'
  })
  return html
}

/** The theatre review site the header count links to. */
export const THEATRE_SITE = 'https://www.coasttocoastreviews.com'

/** The header count label ("12 reviews"). */
/**
 * The header's count label. A card that shows no review data (the empty
 * state) names no count: the bare "reviews" link, on server and client.
 */
export function theatreCountLabel(totalReviews: number | null | undefined): string {
  return typeof totalReviews === 'number' ? `${totalReviews} reviews` : 'reviews'
}

export function updateTheatreReviews(data: TheatreReviewsExport | null | undefined): void {
  const card = document.getElementById('cardTheatreReviews')
  if (!card) {
    return
  }
  // A suppressed card stays suppressed: only the focus gate releases it.
  if (isSuppressedCard(card)) {
    return
  }
  // null or undefined: the export could not be read. The card keeps what it
  // shows; only a successful empty result ([]) empties it.
  if (data == null || data.reviews == null) {
    return
  }

  let countEl = document.getElementById('theatreCount')
  if (countEl && countEl.tagName !== 'A') {
    // A server-rendered non-data state left an empty slot: restore the link.
    const link = document.createElement('a')
    link.className = countEl.className
    link.id = 'theatreCount'
    link.href = THEATRE_SITE
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    countEl.replaceWith(link)
    countEl = link
  }
  if (countEl) {
    // An empty result shows the server's empty header: no count.
    countEl.textContent = theatreCountLabel(data.reviews.length === 0 ? null : data.totalReviews)
  }

  // Empty state: render the shared placeholder. This replaces `.widget-body`
  // (destroying #theatreRow), so the populated path recreates it on an
  // empty -> populated transition.
  if (data.reviews.length === 0) {
    renderWidgetEmpty('cardTheatreReviews', {message: widgets.theatreReviews.empty})
    return
  }

  revealLiveData(card)
  let row = document.getElementById('theatreRow')
  if (!row) {
    const body = card.querySelector('.widget-body')
    if (!body) {
      card.classList.remove('is-loading')
      return
    }
    body.innerHTML = '<div id="theatreRow" class="theatre-row"></div>'
    row = document.getElementById('theatreRow')
  }
  if (!row) {
    card.classList.remove('is-loading')
    return
  }

  row.innerHTML = theatreCardsHtml(data.reviews)
  installImageFallbacks(row)
  card.classList.remove('is-loading')
}

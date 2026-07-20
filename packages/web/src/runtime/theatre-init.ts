import {esc} from './html-utils'
import {imgFallbackAttrs, localizeImageUrl} from './image-utils'
import type {TheatreReviewsExport} from '../types/exports'

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

export function initTheatreReviews(container: HTMLElement, fixtureData: {reviews: TheatreReviewsExport['reviews']; totalReviews: number}): void {
  // Idempotency guard: prevent duplicate innerHTML rewrites + flicker.
  if (container.dataset.theatreInit === '1') {
    return
  }
  container.dataset.theatreInit = '1'

  const countEl = container.querySelector<HTMLElement>('#theatreCount')
  if (countEl) {
    countEl.textContent = fixtureData.totalReviews + ' reviews'
  }

  const row = container.querySelector<HTMLElement>('#theatreRow')
  if (!row || fixtureData.reviews.length === 0) {
    const card = container.querySelector<HTMLElement>('.tri-card')
    if (card) {
      card.classList.remove('is-loading')
    }
    return
  }

  let html = ''
  fixtureData.reviews.forEach((r, i) => {
    const gradeColor = (r.rating && GRADE_COLORS[r.rating]) || ''
    html += '<a class="theatre-card" href="' + esc(r.url) + '" target="_blank" rel="noopener noreferrer" style="animation-delay: ' + i * 0.08 + 's">'
    html += '<div class="theatre-poster-wrap">'
    if (r.imageUrl) {
      const localSrc = localizeImageUrl(r.imageUrl)
      const cardUrl = localizeImageUrl(r.imageUrlCard ?? null)
      const fallback = imgFallbackAttrs(cardUrl || localSrc, r.imageUrl)
      if (cardUrl) {
        const avifSrc = r.imageUrlCardAvif
          ? '<source srcset="' + esc(r.imageUrlCardAvif) + ' 1x, ' + esc(r.imageUrlAvif ?? r.imageUrl) + ' 2x" type="image/avif">'
          : ''
        const imgTag = '<img src="' +
          esc(cardUrl) +
          '" srcset="' +
          esc(cardUrl) +
          ' 1x, ' +
          esc(localSrc ?? r.imageUrl) +
          ' 2x" width="95" height="143" alt="' +
          esc(r.title) +
          '" loading="lazy" decoding="async" referrerpolicy="no-referrer"' +
          fallback +
          '>'
        html += avifSrc ? '<picture>' + avifSrc + imgTag + '</picture>' : imgTag
      } else {
        const avifSrc = r.imageUrlAvif
          ? '<source srcset="' + esc(r.imageUrlAvif) + '" type="image/avif">'
          : ''
        const imgTag = '<img src="' +
          esc(localSrc ?? r.imageUrl) +
          '" width="95" height="143" alt="' +
          esc(r.title) +
          '" loading="lazy" decoding="async" referrerpolicy="no-referrer"' +
          fallback +
          '>'
        html += avifSrc ? '<picture>' + avifSrc + imgTag + '</picture>' : imgTag
      }
    }
    if (r.rating) {
      html += '<span class="theatre-grade" style="color:' + gradeColor + ';border-color:' + gradeColor + '">' + esc(r.rating) + '</span>'
    }
    html += '</div>'
    html += '<div class="theatre-title"><span>' + esc(r.title) + '</span></div>'
    html += '</a>'
  })

  row.innerHTML = html

  const card = container.querySelector<HTMLElement>('.tri-card')
  if (card) {
    card.classList.remove('is-loading')
  }
}

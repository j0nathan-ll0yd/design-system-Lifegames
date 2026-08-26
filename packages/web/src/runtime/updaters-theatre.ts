import {widgets} from '@j0nathan-ll0yd/copy'
import {esc} from './html-utils'
import {imgFallbackAttrs, installImageFallbacks, localizeImageUrl} from './image-utils'
import {renderWidgetEmpty} from './updater-empty'
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

export function updateTheatreReviews(data: TheatreReviewsExport): void {
  const card = document.getElementById('cardTheatreReviews')
  if (!card) {
    return
  }

  const countEl = document.getElementById('theatreCount')
  if (countEl) {
    countEl.textContent = `${data.totalReviews} reviews`
  }

  // Empty state: render the shared placeholder. This replaces `.widget-body`
  // (destroying #theatreRow), so the populated path recreates it on an
  // empty -> populated transition.
  if (data.reviews.length === 0) {
    renderWidgetEmpty('cardTheatreReviews', {message: widgets.theatreReviews.empty})
    return
  }

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

  let html = ''
  data.reviews.forEach((r, i) => {
    const gradeColor = (r.rating && GRADE_COLORS[r.rating]) || ''
    html += `<a class="theatre-card" href="${esc(r.url)}" target="_blank" rel="noopener noreferrer" style="animation-delay: ${i * 0.08}s">`
    html += `<div class="theatre-poster-wrap">`
    if (r.imageUrl) {
      const localSrc = localizeImageUrl(r.imageUrl)
      const cardUrl = localizeImageUrl(r.imageUrlCard ?? null)
      const fallback = imgFallbackAttrs(cardUrl || localSrc)
      if (cardUrl) {
        // The 2x entry is emitted only when a real AVIF exists for it — a
        // non-AVIF URL inside type="image/avif" is chosen by the browser and
        // then fails to decode, with no <picture> fallback to recover it.
        var avifSrc = r.imageUrlCardAvif
          ? '<source srcset="' + esc(r.imageUrlCardAvif) + ' 1x' + (r.imageUrlAvif ? ', ' + esc(r.imageUrlAvif) + ' 2x' : '') + '" type="image/avif">'
          : ''
        var imgTag = '<img src="' +
          esc(cardUrl) +
          '" srcset="' +
          esc(cardUrl) +
          ' 1x, ' +
          esc(localSrc ?? r.imageUrl) +
          ' 2x" width="95" height="143" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer"' +
          fallback +
          '>'
        html += avifSrc ? '<picture>' + avifSrc + imgTag + '</picture>' : imgTag
      } else {
        var avifSrc = r.imageUrlAvif
          ? '<source srcset="' + esc(r.imageUrlAvif) + '" type="image/avif">'
          : ''
        var imgTag = '<img src="' +
          esc(localSrc ?? r.imageUrl) +
          '" width="95" height="143" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer"' +
          fallback +
          '>'
        html += avifSrc ? '<picture>' + avifSrc + imgTag + '</picture>' : imgTag
      }
    }
    if (r.rating) {
      html += `<span class="theatre-grade" style="color:${gradeColor};border-color:${gradeColor}">${esc(r.rating)}</span>`
    }
    html += `</div>`
    html += `<div class="theatre-title"><span>${esc(r.title)}</span></div>`
    html += '</a>'
  })

  row.innerHTML = html
  installImageFallbacks(row)
  card.classList.remove('is-loading')
}

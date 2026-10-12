import type {HydrationProps} from '../widgets/health/Hydration.types'
import {HYDRATION} from './constants'
import {NO_READING} from './widget-state'
import {hydrationRangeHtml} from './widget-markup'
import {rangeBand} from './widget-views'

/** Draw a vessel's target-range band with the server's markup (hydrationRangeHtml). */
function addRange(parent: Element, lo: number, hi: number, max: number, kind: 'water' | 'coffee'): void {
  const band = rangeBand(lo, hi, max)
  if (band) {
    parent.insertAdjacentHTML('afterbegin', hydrationRangeHtml(kind, band))
  }
}

function countUp(el: HTMLElement | null, target: number, unit: string, reducedMotion: boolean): void {
  if (!el) {
    return
  }
  if (reducedMotion) {
    el.textContent = target + ' ' + unit
    return
  }
  let startTime: number | null = null
  function step(ts: number): void {
    if (!el) {
      return
    }
    if (el.dataset.liveUpdated) {
      return
    }
    if (startTime === null) {
      startTime = ts
    }
    const p = Math.min((ts - startTime) / 1200, 1)
    const eased = 1 - Math.pow(1 - p, 3)
    el.textContent = Math.round(target * eased) + ' ' + unit
    if (p < 1) {
      requestAnimationFrame(step)
    }
  }
  requestAnimationFrame(step)
}

export function initHydration(container: HTMLElement, fixture: HydrationProps): void {
  // Idempotency guard: prevent duplicate count-up animations + DOM mutations.
  if (container.dataset.hydrationInit === '1') {
    return
  }
  container.dataset.hydrationInit = '1'

  const hydration = fixture.health?.hydration
  if (!hydration) {
    return
  }
  // Measurements stay null when the export did not carry them (atlas 0160, H03):
  // the bar stays empty and no count-up runs. Scale configuration falls back to
  // the design-system constants.
  const waterOz = hydration.waterOz
  const waterMax = hydration.waterMax
  const waterPct = waterOz != null && waterMax > 0 ? Math.min(waterOz / waterMax, 1) * 100 : 0

  const caffeineMg = hydration.caffeineMg
  const caffeineMax = hydration.caffeineMax ?? HYDRATION.caffeineMax
  const caffeinePct = caffeineMg != null && caffeineMax > 0 ? Math.min(caffeineMg / caffeineMax, 1) * 100 : 0

  const waterRangeLo = hydration.waterRangeLo
  const waterRangeHi = hydration.waterRangeHi
  const caffeineRangeLo = hydration.caffeineRangeLo ?? HYDRATION.caffeineRangeLo
  const caffeineRangeHi = hydration.caffeineRangeHi ?? HYDRATION.caffeineRangeHi

  // The server already rendered these values (data-ssr-state live or stale):
  // keep them. No count-up from 0 and no repaint; the value elements are marked
  // as already updated so a later live update is the only writer.
  const ssrState = container.dataset.ssrState
  const serverRendered = ssrState === 'live' || ssrState === 'stale'

  const waterValEl = container.querySelector<HTMLElement>('#hydraWaterVal')
  const coffeeValEl = container.querySelector<HTMLElement>('#hydraCoffeeVal')
  if (serverRendered) {
    if (waterValEl) {
      waterValEl.dataset.liveUpdated = '1'
    }
    if (coffeeValEl) {
      coffeeValEl.dataset.liveUpdated = '1'
    }
    container.classList.remove('is-loading')
    return
  }

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // Liquid fill via clip-path
  const wLiq = container.querySelector<HTMLElement>('#hydraWaterLiq')
  const cLiq = container.querySelector<HTMLElement>('#hydraCoffeeLiq')

  if (wLiq && cLiq) {
    // Skip transition on initial load to prevent CLS from bubbles becoming visible
    // during the clip-path animation. Set target value instantly.
    wLiq.style.transition = 'none'
    cLiq.style.transition = 'none'
    wLiq.style.clipPath = 'inset(' + (100 - waterPct) + '% 0 0 0)'
    cLiq.style.clipPath = 'inset(' + (100 - caffeinePct) + '% 0 0 0)'

    // Re-enable transition after two frames so live-data updates animate smoothly
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        wLiq.style.transition = ''
        cLiq.style.transition = ''
      })
    })
  }

  // Skeleton/empty tiles opt out of range overlay via data-no-range.
  // A server-rendered range overlay is never duplicated.
  if (!container.closest('[data-no-range]')) {
    const bottleBody = container.querySelector<HTMLElement>('.hydra-bottle-body')
    if (bottleBody && !bottleBody.querySelector('.hydra-range')) {
      addRange(bottleBody, waterRangeLo, waterRangeHi, waterMax, 'water')
    }

    const mugBody = container.querySelector<HTMLElement>('.hydra-mug-body')
    if (mugBody && !mugBody.querySelector('.hydra-range')) {
      addRange(mugBody, caffeineRangeLo, caffeineRangeHi, caffeineMax, 'coffee')
    }
  }

  // Count-up animation on value labels (a missing measurement shows the no-reading mark).
  if (waterOz != null) {
    countUp(waterValEl, waterOz, 'oz', prefersReducedMotion)
  } else if (waterValEl) {
    waterValEl.textContent = NO_READING
  }
  if (caffeineMg != null) {
    countUp(coffeeValEl, caffeineMg, 'mg', prefersReducedMotion)
  } else if (coffeeValEl) {
    coffeeValEl.textContent = NO_READING
  }

  // Remove loading state. The container IS the .tri-card root (the widget
  // renders `<div class="tri-card ..." id="cardHydration">`), so target the
  // container directly. A querySelector('.tri-card') would search descendants
  // and miss the root, leaving the skeleton overlay visible forever.
  container.classList.remove('is-loading')
}

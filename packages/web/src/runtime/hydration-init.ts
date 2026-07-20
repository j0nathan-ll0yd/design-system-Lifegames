import type {HydrationProps} from '../widgets/health/Hydration.types'

function addRange(parent: Element, lo: number, hi: number, max: number, cssClass: string, labelClass: string, loLabel: string, hiLabel: string): void {
  const loPct = (lo / max) * 100
  const hiPct = (hi / max) * 100
  const zone = document.createElement('div')
  zone.className = 'hydra-range ' + cssClass
  zone.style.bottom = loPct + '%'
  zone.style.height = hiPct - loPct + '%'
  const topLbl = document.createElement('div')
  topLbl.className = 'hydra-range-label hydra-range-label-top ' + labelClass
  topLbl.textContent = hiLabel
  zone.appendChild(topLbl)
  const btmLbl = document.createElement('div')
  btmLbl.className = 'hydra-range-label hydra-range-label-bottom ' + labelClass
  btmLbl.textContent = loLabel
  zone.appendChild(btmLbl)
  parent.appendChild(zone)
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

  const hydration = fixture.health.hydration
  const waterOz = hydration.waterOz
  const waterMax = hydration.waterMax
  const waterPct = Math.min(waterOz / waterMax, 1) * 100

  const caffeineMg = hydration.caffeineMg ?? 0
  const caffeineMax = hydration.caffeineMax ?? 500
  const caffeinePct = caffeineMax > 0 ? Math.min(caffeineMg / caffeineMax, 1) * 100 : 0

  const waterRangeLo = hydration.waterRangeLo
  const waterRangeHi = hydration.waterRangeHi
  const caffeineRangeLo = hydration.caffeineRangeLo ?? 200
  const caffeineRangeHi = hydration.caffeineRangeHi ?? 400

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

  // Skeleton/empty tiles opt out of range overlay via data-no-range
  if (container.closest('[data-no-range]')) {
    return
  }

  // Range markers
  const bottleBody = container.querySelector<HTMLElement>('.hydra-bottle-body')
  if (bottleBody) {
    addRange(bottleBody, waterRangeLo, waterRangeHi, waterMax, 'hydra-range-water', 'hydra-range-label-water', String(waterRangeLo), String(waterRangeHi))
  }

  const mugBody = container.querySelector<HTMLElement>('.hydra-mug-body')
  if (mugBody) {
    addRange(mugBody, caffeineRangeLo, caffeineRangeHi, caffeineMax, 'hydra-range-coffee', 'hydra-range-label-coffee', String(caffeineRangeLo),
      String(caffeineRangeHi))
  }

  // Count-up animation on value labels
  const waterValEl = container.querySelector<HTMLElement>('#hydraWaterVal')
  const coffeeValEl = container.querySelector<HTMLElement>('#hydraCoffeeVal')
  countUp(waterValEl, waterOz, 'oz', prefersReducedMotion)
  countUp(coffeeValEl, caffeineMg, 'mg', prefersReducedMotion)

  // Remove loading state. The container IS the .tri-card root (the widget
  // renders `<div class="tri-card ..." id="cardHydration">`), so target the
  // container directly. A querySelector('.tri-card') would search descendants
  // and miss the root, leaving the skeleton overlay visible forever.
  container.classList.remove('is-loading')
}

import type {LocationExport} from './location-types'

const TRACKING_START = new Date('2026-03-02T00:00:00').getTime()

export function initExplorationOdometerV3(container: HTMLElement, data: LocationExport): void {
  if (container.dataset.odoInit === '1') {
    return
  }
  container.dataset.odoInit = '1'

  const card = container.querySelector<HTMLElement>('.tri-card') ?? container

  const visits = card.querySelector<HTMLElement>('[data-loc="odo-v3-visits"]')
  const places = card.querySelector<HTMLElement>('[data-loc="odo-v3-places"]')
  const cities = card.querySelector<HTMLElement>('[data-loc="odo-v3-cities"]')
  const states = card.querySelector<HTMLElement>('[data-loc="odo-v3-states"]')
  const city = card.querySelector<HTMLElement>('[data-loc="odo-v3-city"]')
  const days = card.querySelector<HTMLElement>('[data-loc="odo-v3-days"]')

  if (visits) {
    visits.textContent = (data.totalVisits ?? 0).toLocaleString()
  }
  if (places) {
    places.textContent = (data.totalPlaces ?? 0).toLocaleString()
  }
  if (cities) {
    cities.textContent = (data.explorationStats?.totalCities ?? 0).toLocaleString()
  }
  if (states) {
    states.textContent = (data.explorationStats?.totalStates ?? 0).toLocaleString()
  }
  if (city) {
    city.textContent = data.currentCity ?? ''
  }

  if (days) {
    const daysSince = Math.floor((Date.now() - TRACKING_START) / 86_400_000)
    days.textContent = daysSince + (daysSince === 1 ? ' day' : ' days')
  }

  card.classList.remove('is-loading')
}

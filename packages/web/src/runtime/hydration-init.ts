import type { HydrationProps } from '../widgets/health/Hydration.types';

export function initHydration(container: HTMLElement, fixture: HydrationProps): void {
  const { waterOz, waterMax } = fixture.health.hydration;
  const pct = Math.min(100, Math.round((waterOz / waterMax) * 100));

  const fill = container.querySelector<HTMLElement>('.hydra-fill');
  if (fill) {
    fill.style.height = pct + '%';
  }

  const label = container.querySelector<HTMLElement>('.hydra-pct');
  if (label) {
    label.textContent = pct + '%';
  }

  const ozEl = container.querySelector<HTMLElement>('.hydra-oz');
  if (ozEl) {
    ozEl.textContent = waterOz + ' oz';
  }

  const card = container.querySelector<HTMLElement>('.tri-card');
  if (card) {
    card.classList.remove('is-loading');
  }
}

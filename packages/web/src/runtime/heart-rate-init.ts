import { classifyHeartRate, classifyHRV, generateECGSamples, buildECGPath } from './heart-rate';
import type { HeartRateProps } from '../widgets/health/HeartRate.types';

export function initHeartRate(container: HTMLElement, fixture: HeartRateProps): void {
  const hr = Math.round(fixture.health.quantities.heartRate.value);
  const hrv = Math.round(fixture.health.quantities.hrvSDNN.value);
  const zone = classifyHeartRate(hr);
  const hrvStyle = classifyHRV(hrv);

  const bpm = container.querySelector<HTMLElement>('#pulseBpm');
  if (bpm) {
    bpm.textContent = String(hr);
    bpm.style.color = zone.bpmColor;
    bpm.style.textShadow = zone.bpmShadow;
  }

  const badge = container.querySelector<HTMLElement>('#hrZoneBadge');
  if (badge) {
    badge.textContent = zone.zone;
    badge.style.color = zone.badgeColor;
    badge.style.background = zone.badgeBg;
    badge.style.border = '1px solid ' + zone.badgeBorder;
  }

  const hrvEl = container.querySelector<HTMLElement>('#hrvValue');
  if (hrvEl) {
    hrvEl.textContent = String(hrv);
    hrvEl.style.color = hrvStyle.color;
    hrvEl.style.textShadow = hrvStyle.shadow;
  }

  const card = container.querySelector<HTMLElement>('.tri-card');
  if (card) {
    card.classList.remove('is-loading');
    card.classList.add(zone.accentClass);
  }

  const ecgPath = container.querySelector<SVGPathElement>('#ecgPath');
  if (ecgPath) {
    ecgPath.setAttribute('d', buildECGPath(hr));
    ecgPath.style.stroke = zone.ecgStroke;
    ecgPath.style.opacity = String(zone.ecgOpacity);

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReducedMotion) {
      ecgPath.style.animationDuration = zone.ecgSpeed;
    }
  }
}

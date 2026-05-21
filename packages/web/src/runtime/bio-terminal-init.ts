import type { BioTerminalProps } from '../widgets/identity/BioTerminal.types';

export function initBioTerminal(container: HTMLElement, fixture: BioTerminalProps): void {
  const lines = fixture.profile.terminalLines;
  const outputEls = container.querySelectorAll<HTMLElement>('.terminal-line');

  let delay = 0;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  outputEls.forEach((el, i) => {
    if (prefersReducedMotion) {
      el.classList.add('visible');
      return;
    }

    delay += 80 + Math.random() * 40;
    setTimeout(() => {
      el.classList.add('visible');
    }, delay);
  });

  const card = container.querySelector<HTMLElement>('.tri-card');
  if (card) {
    card.classList.remove('is-loading');
  }
}

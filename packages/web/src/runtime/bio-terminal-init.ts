import type { BioTerminalProps } from '../widgets/identity/BioTerminal.types';

function typeText(spanEl: HTMLElement, text: string, callback: (() => void) | null): void {
  let i = 0;
  function next(): void {
    if (i < text.length) {
      spanEl.textContent += text[i];
      i++;
      setTimeout(next, 30);
    } else if (callback) {
      callback();
    }
  }
  next();
}

function revealLine(lines: NodeListOf<HTMLElement>, idx: number): void {
  if (idx >= lines.length) return;
  const line = lines[idx];
  line.classList.add('visible');

  const cmd = line.getAttribute('data-cmd');
  const output = line.getAttribute('data-output');

  if (cmd !== null) {
    const cmdSpan = line.querySelector<HTMLElement>('.terminal-command');
    if (cmdSpan) {
      cmdSpan.style.opacity = '1';
      typeText(cmdSpan, cmd, () => {
        setTimeout(() => revealLine(lines, idx + 1), 200);
      });
    }
  } else if (output !== null) {
    const outSpan = line.querySelector<HTMLElement>('.terminal-output');
    if (outSpan) {
      outSpan.style.opacity = '1';
      typeText(outSpan, output, () => {
        setTimeout(() => revealLine(lines, idx + 1), 80);
      });
    }
  } else {
    // Blank / cursor lines — pause then advance
    setTimeout(() => revealLine(lines, idx + 1), 400);
  }
}

// _fixture is reserved for showcase-time type narrowing; production callers pass
// nothing and rely on the SSR-rendered HTML being the source of truth.
export function initBioTerminal(container: HTMLElement, _fixture?: BioTerminalProps): void {
  // Idempotency guard: when multiple BioTerminalIsland instances exist on one page
  // (Live Demo + State Matrix slots), each bundles its own IntersectionObserver and
  // observes ALL `[data-widget-preview][data-fixture]` containers — without this
  // guard, the typewriter loop is invoked N times per container, stacking characters.
  if (container.dataset.bioTerminalInit === '1') return;
  container.dataset.bioTerminalInit = '1';

  const termBody = container.querySelector<HTMLElement>('.terminal-body');
  if (!termBody) return;

  const lines = termBody.querySelectorAll<HTMLElement>('.terminal-line');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = window.innerWidth < 768;

  // Remove loading state immediately
  const card = container.querySelector<HTMLElement>('.tri-card');
  if (card) {
    card.classList.remove('is-loading');
  }

  // Reduced motion or mobile: show all lines instantly, no typewriter
  if (prefersReducedMotion || isMobile) {
    for (let j = 0; j < lines.length; j++) {
      lines[j].classList.add('visible');
    }
    return;
  }

  // Desktop: hide and clear pre-rendered text so typewriter can re-type it.
  // opacity:0 prevents blank-flash on pages where the card is immediately visible
  // (e.g. widget detail pages where compat.css forces opacity:1 on [data-widget-preview]).
  for (let k = 0; k < lines.length; k++) {
    const cmdSpan = lines[k].querySelector<HTMLElement>('.terminal-command');
    const outSpan = lines[k].querySelector<HTMLElement>('.terminal-output');
    if (cmdSpan) {
      cmdSpan.style.opacity = '0';
      cmdSpan.textContent = '';
    }
    if (outSpan) {
      outSpan.style.opacity = '0';
      outSpan.textContent = '';
    }
  }

  // Deterministic per-tile stagger: guarantees ≥150ms between tiles (above the
  // ~80ms perceptibility threshold), unlike Math.random() which can cluster.
  const allContainers = Array.from(
    document.querySelectorAll<HTMLElement>('[data-widget-preview][data-fixture]'),
  );
  const tileIndex = Math.max(0, allContainers.indexOf(container));
  const delay = 100 + tileIndex * 150;
  setTimeout(() => revealLine(lines, 0), delay);
}

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
      typeText(cmdSpan, cmd, () => {
        setTimeout(() => revealLine(lines, idx + 1), 200);
      });
    }
  } else if (output !== null) {
    const outSpan = line.querySelector<HTMLElement>('.terminal-output');
    if (outSpan) {
      typeText(outSpan, output, () => {
        setTimeout(() => revealLine(lines, idx + 1), 80);
      });
    }
  } else {
    // Blank / cursor lines — pause then advance
    setTimeout(() => revealLine(lines, idx + 1), 400);
  }
}

export function initBioTerminal(container: HTMLElement, _fixture: BioTerminalProps): void {
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

  // Desktop: clear pre-rendered text so typewriter can re-type it
  for (let k = 0; k < lines.length; k++) {
    const cmdSpan = lines[k].querySelector<HTMLElement>('.terminal-command');
    const outSpan = lines[k].querySelector<HTMLElement>('.terminal-output');
    if (cmdSpan) cmdSpan.textContent = '';
    if (outSpan) outSpan.textContent = '';
  }

  // Start the typewriter reveal after a brief delay
  setTimeout(() => revealLine(lines, 0), 500);
}

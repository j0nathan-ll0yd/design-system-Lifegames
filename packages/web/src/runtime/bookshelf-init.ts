import type { BookshelfProps } from '../widgets/reading/Bookshelf.types';

export function initBookshelf(container: HTMLElement, fixture: BookshelfProps): void {
  const imgs = container.querySelectorAll<HTMLImageElement>('img[data-fallback]');
  imgs.forEach((img) => {
    img.onerror = function () {
      const fallback = img.dataset.fallback;
      if (fallback) {
        img.srcset = '';
        img.src = fallback;
        img.onerror = null;
      }
    };
  });

  const card = container.querySelector<HTMLElement>('.tri-card');
  if (card) {
    card.classList.remove('is-loading');
  }
}

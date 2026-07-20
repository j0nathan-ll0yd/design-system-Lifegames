import {a11y} from '@lifegames/copy'

const PAGE_SIZE = 10

function paginateReadingFeed(card: HTMLElement, debug: boolean): void {
  const body = card.querySelector('.widget-body')
  if (!body) {
    if (debug) {
      console.debug('[ReadingFeed] no .widget-body')
    }
    return
  }
  const list = body.querySelector('.article-list')
  if (!list) {
    if (debug) {
      console.debug('[ReadingFeed] no .article-list')
    }
    return
  }
  const items = Array.from(list.querySelectorAll('.article-list-item'))
  if (debug) {
    console.debug('[ReadingFeed] items =', items.length)
  }
  if (items.length <= PAGE_SIZE) {
    return
  }

  const totalPages = Math.ceil(items.length / PAGE_SIZE)
  let currentPage = 1

  const existingPager = body.querySelector('.article-pagination')
  if (existingPager) {
    existingPager.remove()
  }

  const pager = document.createElement('div')
  pager.className = 'article-pagination'
  for (let p = 1; p <= totalPages; p++) {
    const btn = document.createElement('button')
    btn.className = 'article-page-btn' + (p === 1 ? ' article-page-active' : '')
    btn.dataset.page = String(p)
    btn.textContent = String(p)
    btn.setAttribute('aria-label', a11y.readingFeed.pagination.replace('{page}', String(p)).replace('{total}', String(totalPages)))
    if (p === 1) {
      btn.setAttribute('aria-current', 'page')
    }
    pager.appendChild(btn)
  }
  body.appendChild(pager)

  function showPage(page: number): void {
    items.forEach((it, idx) => {
      const visible = idx >= (page - 1) * PAGE_SIZE && idx < page * PAGE_SIZE
      ;(it as HTMLElement).style.display = visible ? '' : 'none'
    })
    pager.querySelectorAll<HTMLButtonElement>('.article-page-btn').forEach((btn) => {
      const target = Number(btn.dataset.page)
      if (target === page) {
        btn.classList.add('article-page-active')
        btn.setAttribute('aria-current', 'page')
      } else {
        btn.classList.remove('article-page-active')
        btn.removeAttribute('aria-current')
      }
    })
  }

  pager.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement).closest<HTMLButtonElement>('.article-page-btn')
    if (!target) {
      return
    }
    const targetPage = Number(target.dataset.page)
    if (targetPage && targetPage !== currentPage) {
      currentPage = targetPage
      showPage(currentPage)
    }
  })

  showPage(currentPage)
}

export function initReadingFeedPagination(selector: string): void {
  const debug = new URLSearchParams(location.search).has('debug')
  function run() {
    const cards = document.querySelectorAll<HTMLElement>(selector)
    if (debug) {
      console.debug('[ReadingFeed] selector =', selector, 'cards =', cards.length, 'readyState =', document.readyState)
    }
    cards.forEach((card) => paginateReadingFeed(card, debug))
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, {once: true})
  } else {
    run()
  }
}

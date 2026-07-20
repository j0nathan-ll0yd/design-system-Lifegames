// @vitest-environment jsdom
import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {updateReadingFeed} from '../../src/runtime/updaters'
import type {AdaptedArticle} from '../../src/runtime/adapters'

// ── helpers ───────────────────────────────────────────────────────────────────

function el(id: string): HTMLElement {
  const e = document.getElementById(id)
  if (!e) {
    throw new Error(`Missing element #${id}`)
  }
  return e as HTMLElement
}

function makeArticles(n: number): AdaptedArticle[] {
  return Array.from({length: n},
    (_, i) => ({title: `Article ${i}`, url: `https://example.com/${i}`, source: 'Source', date: '1h ago', hasNotes: false, noteText: null}))
}

/**
 * Stub `document.startViewTransition` so its callback runs ASYNCHRONOUSLY, the
 * way real Safari/Chrome do. jsdom lacks the View Transition API, so without
 * this stub `withViewTransition` takes its synchronous fallback path and the
 * async listener-destruction regression is invisible. Returns a restore fn.
 */
function stubAsyncViewTransition(): () => void {
  const doc = document as Document & {startViewTransition?: (cb: () => void) => ViewTransition}
  const originalStart = doc.startViewTransition
  doc.startViewTransition = (cb: () => void): ViewTransition => {
    queueMicrotask(cb)
    return {
      finished: Promise.resolve(),
      ready: Promise.resolve(),
      updateCallbackDone: Promise.resolve(),
      skipTransition(): void {
        /* no-op */
      }
    } as ViewTransition
  }

  // jsdom omits matchMedia; real browsers provide it. withViewTransition consults
  // it (prefers-reduced-motion) before taking the async path, so provide a
  // non-reduced-motion implementation to mirror a default browser.
  const win = window as Window & {matchMedia?: (query: string) => MediaQueryList}
  const originalMatchMedia = win.matchMedia
  win.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener(): void {},
      removeEventListener(): void {},
      addListener(): void {},
      removeListener(): void {},
      dispatchEvent(): boolean {
        return false
      }
    }) as MediaQueryList

  return () => {
    doc.startViewTransition = originalStart
    win.matchMedia = originalMatchMedia
  }
}

/** Yields to the microtask queue so a queued startViewTransition callback runs. */
async function flushMicrotasks(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
}

function clickPage(page: number): void {
  const btn = document.querySelector(`.article-page-btn[data-page="${page}"]`) as HTMLButtonElement | null
  if (!btn) {
    throw new Error(`Missing page button ${page}`)
  }
  btn.click()
}

function renderedTitles(): string[] {
  return Array.from(el('cardReading').querySelectorAll('.article-list-title')).map((n) => n.textContent || '')
}

// ── updateReadingFeed pagination (async View Transition) ────────────────────────

describe('updateReadingFeed pagination with async View Transition', () => {
  let restore: () => void

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="cardReading" class="is-loading">
        <div class="widget-body"></div>
      </div>
    `
    restore = stubAsyncViewTransition()
  })

  afterEach(() => {
    restore()
  })

  // Invariant (a): pagination stays clickable after the async list swap.
  it('renders page 3 content after clicking page 2, awaiting the swap, then clicking page 3', async () => {
    const articles = makeArticles(25) // 3 pages of 10
    updateReadingFeed(articles)
    await flushMicrotasks()

    clickPage(2)
    await flushMicrotasks()
    expect(renderedTitles()).toContain('Article 10') // page 2 = indices 10..19
    expect(renderedTitles()).not.toContain('Article 0')

    clickPage(3)
    await flushMicrotasks()
    expect(renderedTitles()).toContain('Article 20') // page 3 = indices 20..24
    expect(renderedTitles()).not.toContain('Article 10')
  })

  // Invariant (b): a poll-tick re-invocation preserves the reader's current page.
  it('preserves the current page across a second updateReadingFeed call (poll tick)', async () => {
    const articles = makeArticles(25)
    updateReadingFeed(articles)
    await flushMicrotasks()

    clickPage(3)
    await flushMicrotasks()
    expect(renderedTitles()).toContain('Article 20')

    // Simulate a live-data poll tick re-rendering the same feed.
    updateReadingFeed(articles)
    await flushMicrotasks()
    expect(renderedTitles()).toContain('Article 20')
    expect(renderedTitles()).not.toContain('Article 0')
  })

  // Invariant (c): empty→populated transition leaves exactly one working handler.
  it('keeps pagination working with exactly one active handler after empty→populated', async () => {
    updateReadingFeed([]) // empty-state branch
    await flushMicrotasks()

    const articles = makeArticles(25)
    updateReadingFeed(articles)
    await flushMicrotasks()

    clickPage(2)
    await flushMicrotasks()
    // If a duplicate handler had been bound, the second handler would re-fire
    // renderPage and could bounce the page; a single handler lands cleanly on 2.
    expect(renderedTitles()).toContain('Article 10')
    expect(renderedTitles()).not.toContain('Article 0')

    clickPage(1)
    await flushMicrotasks()
    expect(renderedTitles()).toContain('Article 0')
    expect(renderedTitles()).not.toContain('Article 10')
  })
})

// @vitest-environment jsdom
// The book modal writes a book into innerHTML. The book is the `data-book`
// JSON a Bookshelf element carries, so every field is whatever JSON.parse
// returns: a string can sit in any field, numeric fields included. No field
// may add an element or an attribute to the modal.
import {beforeEach, describe, expect, it} from 'vitest'
import {initBookModal} from '../../src/runtime/book-modal-init'

const PAYLOAD = '"><img src=x onerror="alert(1)" data-injected>'

// Every field of BookData. `rating` stays a number: the stars compare it and
// never print it, and a string rating must still render no stars markup.
const STRING_FIELDS = [
  'asin',
  'mainImage',
  'mainImageAvif',
  'title',
  'series',
  'author',
  'status',
  'statusLabel',
  'desc',
  'genres',
  'notes',
  'link',
  'finishedAt'
] as const
const NUMERIC_FIELDS = ['seriesNumber', 'seriesTotal', 'pages', 'year', 'progress', 'rating'] as const

function open(book: Record<string, unknown>): HTMLElement {
  document.body.innerHTML = '<dialog id="bookDialog"><div id="bookModal"></div></dialog>' +
    '<div id="cardBooks"><div class="shelf-book" data-book=""></div></div>'
  const dialog = document.getElementById('bookDialog') as HTMLDialogElement
  // jsdom has no top layer: showModal only needs to mark the dialog open.
  dialog.showModal = () => dialog.setAttribute('open', '')
  document.querySelector('.shelf-book')!.setAttribute('data-book', JSON.stringify(book))
  initBookModal()
  ;(document.querySelector('.shelf-book') as HTMLElement).click()
  return document.getElementById('bookModal')!
}

/** Every attribute name in the modal that starts with `on`, and every injected element. */
function injected(modal: HTMLElement): string[] {
  const out: string[] = []
  for (const el of modal.querySelectorAll('*')) {
    for (const a of el.attributes) {
      if (/^on/i.test(a.name) || a.name === 'data-injected') {
        out.push(`${el.tagName.toLowerCase()}[${a.name}]`)
      }
    }
  }
  return out
}

describe('book modal: no book field adds markup', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it.each(['reading', 'finished'])('status %s: every field carries the payload', (status) => {
    const book: Record<string, unknown> = {}
    for (const f of [...STRING_FIELDS, ...NUMERIC_FIELDS]) {
      book[f] = PAYLOAD
    }
    // The status branch decides which fields render; the label still carries the payload.
    book.status = status
    const modal = open(book)
    expect(modal.innerHTML).not.toBe('')
    expect(injected(modal)).toEqual([])
    // The cover is the only image.
    expect(modal.querySelectorAll('img')).toHaveLength(1)
  })

  it.each(STRING_FIELDS)('%s alone carries the payload', (field) => {
    const book: Record<string, unknown> = {title: 'T', status: 'finished', finishedAt: '2026-01-02T00:00:00Z', notes: 'n', rating: 4, [field]: PAYLOAD}
    const modal = open(book)
    expect(injected(modal)).toEqual([])
    expect(modal.querySelectorAll('img')).toHaveLength(1)
  })

  it.each(NUMERIC_FIELDS)('%s as a string carries the payload', (field) => {
    const book: Record<string, unknown> = {title: 'T', series: 'S', status: 'reading', [field]: PAYLOAD}
    const modal = open(book)
    expect(injected(modal)).toEqual([])
    expect(modal.querySelectorAll('img')).toHaveLength(1)
  })

  it('the status renders as one class token', () => {
    const modal = open({title: 'T', status: 'finished x" onclick="alert(1)', statusLabel: 'Read'})
    const stat = modal.querySelector('.book-modal-stat-val.shelf-book-status')!
    expect(stat.getAttribute('onclick')).toBeNull()
    expect(stat.textContent).toBe('Read')
  })

  it('a link that is not https renders no anchor', () => {
    for (const link of ['javascript:alert(1)', 'data:text/html,x', '/relative', 'http://example.com/']) {
      const modal = open({title: 'T', status: 'finished', link})
      expect(modal.querySelector('.book-modal-amazon'), link).toBeNull()
    }
    const modal = open({title: 'T', status: 'finished', link: 'https://www.amazon.com/dp/X'})
    expect(modal.querySelector('.book-modal-amazon')!.getAttribute('href')).toBe('https://www.amazon.com/dp/X')
  })

  it('numeric fields still render as numbers', () => {
    const modal = open({
      title: 'T',
      series: 'S',
      seriesNumber: 2,
      seriesTotal: 3,
      pages: 320,
      year: 2019,
      status: 'reading',
      statusLabel: 'Reading',
      progress: 40
    })
    expect(modal.querySelector('.book-modal-series')!.textContent).toBe('S · Book 2 of 3')
    expect([...modal.querySelectorAll('.book-modal-stat-val')].map((e) => e.textContent)).toEqual(['320', '2019', 'Reading'])
    expect((modal.querySelector('.book-modal-progress-fill') as HTMLElement).style.width).toBe('40%')
  })
})

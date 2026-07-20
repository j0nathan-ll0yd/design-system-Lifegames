import type {Meta, StoryObj} from '@storybook/web-components-vite'
import {html} from 'lit'

// DS-internal fixture: reading/book-modal.json (empty object — modal is initially empty, filled by click handler)
// Synthetic fixture: show modal in open state with a sample book
const meta: Meta = {
  title: 'Production/Reading/BookModal',
  tags: ['stable', 'autodocs'],
  argTypes: {visible: {control: 'boolean'}, bookTitle: {control: 'text'}, bookAuthor: {control: 'text'}, rating: {control: 'number'}},
  render: (args) =>
    html`
    <div
      id="bookModal"
      class="lg-modal-overlay ${args.visible ? 'visible' : ''}"
      role="dialog"
      aria-modal="true"
      aria-label="Book details"
    >
      <div
        class="lg-modal"
        style="background: var(--lg-color-surface); border-radius: 8px; padding: 24px; max-width: 400px; margin: auto;"
      >
        <button
          class="lg-modal-close"
          aria-label="Close"
          style="float: right; background: none; border: none; cursor: pointer; color: var(--lg-color-text-muted);"
        >
          &times;
        </button>
        <div class="lg-modal-body">
          ${
      args.bookTitle
        ? html`<h2 style="color: var(--lg-color-text-title); margin: 0 0 4px;">
                ${args.bookTitle}
              </h2>`
        : ''
    }
          <p style="color: var(--lg-color-text-muted); margin: 0 0 12px; font-size: 0.9em;">
            ${args.bookAuthor ?? 'Author'}
          </p>
          ${
      args.rating != null
        ? html`<div style="color: var(--lg-color-accent-amber);">
                ${'★'.repeat(args.rating)}${'☆'.repeat(5 - args.rating)}
              </div>`
        : ''
    }
        </div>
      </div>
    </div>
  `
}

export default meta
type Story = StoryObj

export const Default: Story = {args: {visible: true, bookTitle: 'The Pragmatic Programmer', bookAuthor: 'David Thomas, Andrew Hunt', rating: 5}}

export const Empty: Story = {args: {visible: false, bookTitle: '', bookAuthor: '', rating: null}}

export const Loading: Story = {args: {visible: false, bookTitle: '', bookAuthor: '', rating: null}}

export const Dark: Story = {...Default, globals: {backgrounds: {value: 'dark'}}}

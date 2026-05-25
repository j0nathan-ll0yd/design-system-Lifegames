import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';

// DS-internal fixture: reading/bookshelf.json
const defaultBooks = [
  { asin: '0525573844', title: 'The Pragmatic Programmer', author: 'David Thomas, Andrew Hunt', status: 'in_progress', progress: 68, rating: null },
  { asin: '0593128508', title: 'Designing Data-Intensive Applications', author: 'Martin Kleppmann', status: 'completed', progress: null, rating: 5 },
  { asin: '0593723848', title: 'A Philosophy of Software Design', author: 'John Ousterhout', status: 'next', progress: null, rating: null },
];

const statusLabels: Record<string, string> = { in_progress: 'Reading', completed: 'Completed', next: 'Up Next' };
const statusColor: Record<string, string> = { in_progress: 'var(--lg-color-accent-blue)', completed: 'var(--lg-color-accent-green)', next: 'var(--lg-color-text-muted)' };

function renderBookshelf(books: typeof defaultBooks) {
  if (!books?.length) {
    return html`
      <div id="cardBooks" class="tri-card">
        <div class="widget-header"><span class="widget-label">Bookshelf</span></div>
        <div class="widget-body" style="padding: 16px; color: var(--lg-color-text-muted); text-align: center;">No books on shelf</div>
      </div>
    `;
  }
  return html`
    <div id="cardBooks" class="tri-card">
      <div class="widget-header"><span class="widget-label">Bookshelf</span></div>
      <div class="widget-body" style="padding: 8px 16px; color: var(--lg-color-text-primary);">
        ${books.map((b) => html`
          <div style="display: flex; justify-content: space-between; align-items: flex-start; padding: 8px 0; border-bottom: 1px solid var(--lg-color-border);">
            <div style="flex: 1; min-width: 0;">
              <div style="font-size: 0.9em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${b.title}</div>
              <div style="font-size: 0.75em; color: var(--lg-color-text-muted);">${b.author}</div>
              ${b.progress != null ? html`<div style="font-size: 0.75em; color: var(--lg-color-accent-blue);">${b.progress}%</div>` : ''}
            </div>
            <span style="font-size: 0.75em; color: ${statusColor[b.status] ?? 'inherit'}; margin-left: 8px; white-space: nowrap;">${statusLabels[b.status] ?? b.status}</span>
          </div>
        `)}
      </div>
    </div>
  `;
}

const meta: Meta = {
  title: 'Production/Reading/Bookshelf',
  tags: ['autodocs'],
  argTypes: { books: { control: 'object' } },
  render: (args) => renderBookshelf(args.books),
};

export default meta;
type Story = StoryObj;

export const Default: Story = { args: { books: defaultBooks } };
export const Empty: Story = { args: { books: [] } };
export const Loading: Story = { args: { books: [] } };

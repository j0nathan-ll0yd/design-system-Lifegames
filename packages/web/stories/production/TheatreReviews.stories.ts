import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';

// DS-internal fixture: reading/theatre-reviews.json (3 reviews for brevity)
const defaultReviews = [
  { title: 'Art', rating: 'A', ratingNumeric: 9, excerpt: 'A sharp, witty examination of friendship tested by the purchase of an expensive white painting.', publishedAt: '2025-11-15' },
  { title: 'Dead Outlaw', rating: 'A-', ratingNumeric: 8, excerpt: 'A raucous, genre-bending musical that brings an obscure historical figure to vivid life.', publishedAt: '2025-09-10' },
  { title: 'Just In Time', rating: 'A+', ratingNumeric: 10, excerpt: 'A masterful revival that captures the golden age of Broadway with infectious energy.', publishedAt: '2025-07-12' },
];

const ratingColor = (n: number) => n >= 9 ? 'var(--lg-color-accent-green)' : n >= 7 ? 'var(--lg-color-accent-amber)' : 'var(--lg-color-accent-red)';

function renderReviews(reviews: typeof defaultReviews) {
  if (!reviews?.length) {
    return html`
      <div id="cardTheatre" class="tri-card">
        <div class="widget-header"><span class="widget-label">Theatre Reviews</span></div>
        <div class="widget-body" style="padding: 16px; color: var(--lg-color-text-muted); text-align: center;">No reviews yet</div>
      </div>
    `;
  }
  return html`
    <div id="cardTheatre" class="tri-card">
      <div class="widget-header"><span class="widget-label">Theatre Reviews</span></div>
      <div class="widget-body" style="padding: 8px 16px; color: var(--lg-color-text-primary);">
        ${reviews.map((r) => html`
          <div style="display: flex; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--lg-color-border);">
            <div style="font-size: 1.3em; font-weight: bold; color: ${ratingColor(r.ratingNumeric)}; width: 32px; flex-shrink: 0;">${r.rating}</div>
            <div>
              <div style="font-size: 0.9em; font-weight: 600;">${r.title}</div>
              <div style="font-size: 0.78em; color: var(--lg-color-text-muted);">${r.excerpt}</div>
            </div>
          </div>
        `)}
      </div>
    </div>
  `;
}

const meta: Meta = {
  title: 'Production/Reading/TheatreReviews',
  tags: ['stable', 'autodocs'],
  argTypes: { reviews: { control: 'object' } },
  render: (args) => renderReviews(args.reviews),
};

export default meta;
type Story = StoryObj;

export const Default: Story = { args: { reviews: defaultReviews } };
export const Empty: Story = { args: { reviews: [] } };
export const Loading: Story = { args: { reviews: [] } };

export const Dark: Story = {
  ...Default,
  globals: {
    backgrounds: {
      value: "dark"
    }
  },
};

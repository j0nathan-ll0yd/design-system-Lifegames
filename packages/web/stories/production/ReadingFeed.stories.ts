import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';

// DS-internal fixture: reading/reading-feed.json (first 4 articles for brevity)
const defaultArticles = [
  { title: 'Understanding WebSocket Performance', source: 'web.dev', date: '3d ago' },
  { title: 'Swift 6.2 Concurrency Improvements', source: 'swift.org', date: '6d ago' },
  { title: 'The State of CSS 2026', source: 'survey.devographics.com', date: '9d ago' },
  { title: 'Building Design Systems at Scale', source: 'medium.com', date: '11d ago' },
];

function renderFeed(articles: typeof defaultArticles) {
  if (!articles?.length) {
    return html`
      <div id="cardReadingFeed" class="tri-card">
        <div class="widget-header"><span class="widget-label">Reading Feed</span></div>
        <div class="widget-body" style="padding: 16px; color: var(--lg-color-text-muted); text-align: center;">No recent articles</div>
      </div>
    `;
  }
  return html`
    <div id="cardReadingFeed" class="tri-card">
      <div class="widget-header"><span class="widget-label">Reading Feed</span></div>
      <div class="widget-body" style="padding: 8px 16px; color: var(--lg-color-text-primary);">
        ${articles.map((a) => html`
          <div style="padding: 6px 0; border-bottom: 1px solid var(--lg-color-border);">
            <div style="font-size: 0.9em;">${a.title}</div>
            <div style="font-size: 0.75em; color: var(--lg-color-text-muted);">${a.source} · ${a.date}</div>
          </div>
        `)}
      </div>
    </div>
  `;
}

const meta: Meta = {
  title: 'Production/Reading/ReadingFeed',
  tags: ['stable', 'autodocs'],
  argTypes: { articles: { control: 'object' } },
  render: (args) => renderFeed(args.articles),
};

export default meta;
type Story = StoryObj;

export const Default: Story = { args: { articles: defaultArticles } };
export const Empty: Story = { args: { articles: [] } };
export const Loading: Story = { args: { articles: [] } };

export const Dark: Story = {
  ...Default,
  parameters: { backgrounds: { default: 'dark' } },
};

import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';

// DS-internal fixture: location/place-leaderboard-v3.json
const defaultPlaces = [
  { name: 'Cascade Brewing', category: 'Food & Drink', visitCount: 47, totalDurationMinutes: 4230, lastVisitAt: '2026-05-18T19:30:00Z' },
  { name: 'Forest Park', category: 'Outdoors & Recreation', visitCount: 38, totalDurationMinutes: 11400, lastVisitAt: '2026-05-17T09:00:00Z' },
  { name: "Powell's Books", category: 'Shopping', visitCount: 29, totalDurationMinutes: 5220, lastVisitAt: '2026-05-15T14:00:00Z' },
];

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  return h > 0 ? `${h}h` : `${minutes}m`;
}

function renderLeaderboard(places: typeof defaultPlaces) {
  if (!places?.length) {
    return html`
      <div id="cardLeaderboard" class="tri-card">
        <div class="widget-header"><span class="widget-label">Place Leaderboard</span></div>
        <div class="widget-body" style="padding: 16px; color: var(--lg-color-text-muted); text-align: center;">No places recorded</div>
      </div>
    `;
  }
  return html`
    <div id="cardLeaderboard" class="tri-card">
      <div class="widget-header"><span class="widget-label">Place Leaderboard</span></div>
      <div class="widget-body" style="padding: 8px 16px; color: var(--lg-color-text-primary);">
        ${places.map((p, i) => html`
          <div style="display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--lg-color-border);">
            <span style="font-size: 1.2em; width: 20px; color: var(--lg-color-text-muted);">${i + 1}</span>
            <div style="flex: 1; min-width: 0;">
              <div style="font-size: 0.9em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.name}</div>
              <div style="font-size: 0.75em; color: var(--lg-color-text-muted);">${p.category}</div>
            </div>
            <div style="text-align: right; font-size: 0.8em;">
              <div>${p.visitCount} visits</div>
              <div style="color: var(--lg-color-text-muted);">${formatDuration(p.totalDurationMinutes)}</div>
            </div>
          </div>
        `)}
      </div>
    </div>
  `;
}

const meta: Meta = {
  title: 'Production/Location/PlaceLeaderboardV3',
  tags: ['autodocs'],
  argTypes: { places: { control: 'object' } },
  render: (args) => renderLeaderboard(args.places),
};

export default meta;
type Story = StoryObj;

export const Default: Story = { args: { places: defaultPlaces } };
export const Empty: Story = { args: { places: [] } };
export const Loading: Story = { args: { places: [] } };

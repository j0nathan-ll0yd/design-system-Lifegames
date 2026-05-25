import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';

// DS-internal fixture: github/dev-activity-log.json
const defaultEvents = [
  { type: 'commit', repo: 'lifegames/api', title: 'Fix auth token refresh logic', date: '2h ago', hash: 'a1b2c3d', additions: 24, deletions: 8 },
  { type: 'pr_merged', repo: 'lifegames/ios', title: 'Add biometric login flow', date: '5h ago', number: 142 },
  { type: 'issue_opened', repo: 'lifegames/api', title: 'Rate limiter drops WebSocket frames', date: '8h ago', number: 89 },
  { type: 'commit', repo: 'demo-user.github.io', title: 'Update profile components', date: '1d ago', hash: 'e4f5g6h', additions: 156, deletions: 12 },
];

const typeIcon: Record<string, string> = {
  commit: '●',
  pr_merged: '⟳',
  pr_opened: '↗',
  pr_closed: '✕',
  issue_opened: '!',
  issue_closed: '✓',
};

function renderLog(events: typeof defaultEvents) {
  if (!events?.length) {
    return html`
      <div id="cardDevLog" class="tri-card">
        <div class="widget-header"><span class="widget-label">Dev Activity</span></div>
        <div class="widget-body" style="padding: 16px; color: var(--lg-color-text-muted); text-align: center;">No recent activity</div>
      </div>
    `;
  }
  return html`
    <div id="cardDevLog" class="tri-card">
      <div class="widget-header"><span class="widget-label">Dev Activity</span></div>
      <div class="widget-body" style="padding: 8px 16px; color: var(--lg-color-text-primary);">
        ${events.map((e) => html`
          <div style="display: flex; gap: 8px; padding: 6px 0; border-bottom: 1px solid var(--lg-color-border);">
            <span style="color: var(--lg-color-accent-green); width: 16px; flex-shrink: 0;">${typeIcon[e.type] ?? '●'}</span>
            <div style="min-width: 0;">
              <div style="font-size: 0.85em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${e.title}</div>
              <div style="font-size: 0.75em; color: var(--lg-color-text-muted);">${e.repo} · ${e.date}</div>
            </div>
          </div>
        `)}
      </div>
    </div>
  `;
}

const meta: Meta = {
  title: 'Production/Github/DevActivityLog',
  tags: ['autodocs'],
  argTypes: { events: { control: 'object' } },
  render: (args) => renderLog(args.events),
};

export default meta;
type Story = StoryObj;

export const Default: Story = { args: { events: defaultEvents } };
export const Empty: Story = { args: { events: [] } };
export const Loading: Story = { args: { events: [] } };

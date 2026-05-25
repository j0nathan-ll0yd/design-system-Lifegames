import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';

// DS-internal fixture: health/daily-activity.json
const meta: Meta = {
  title: 'Production/Health/DailyActivity',
  tags: ['autodocs'],
  argTypes: {
    stepCount: { control: 'number' },
    distanceM: { control: 'number' },
    exerciseMin: { control: 'number' },
    activeKcal: { control: 'number' },
    totalKcal: { control: 'number' },
  },
  render: (args) => html`
    <div id="cardActivity" class="tri-card">
      <div class="widget-header">
        <span class="widget-label">Daily Activity</span>
      </div>
      <div class="widget-body" style="padding: 16px; color: var(--lg-color-text-primary);">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div><span style="color: var(--lg-color-text-muted); font-size: 0.8em;">Steps</span><br /><strong>${args.stepCount?.toLocaleString() ?? '—'}</strong></div>
          <div><span style="color: var(--lg-color-text-muted); font-size: 0.8em;">Distance</span><br /><strong>${args.distanceM ? (args.distanceM / 1000).toFixed(1) + ' km' : '—'}</strong></div>
          <div><span style="color: var(--lg-color-text-muted); font-size: 0.8em;">Exercise</span><br /><strong>${args.exerciseMin ?? '—'} min</strong></div>
          <div><span style="color: var(--lg-color-text-muted); font-size: 0.8em;">Active kcal</span><br /><strong>${args.activeKcal ?? '—'}</strong></div>
        </div>
        <div style="margin-top: 8px; font-size: 0.85em; color: var(--lg-color-text-muted);">Total: ${args.totalKcal ?? '—'} kcal</div>
      </div>
    </div>
  `,
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: { stepCount: 8247, distanceM: 6120, exerciseMin: 42, activeKcal: 384, totalKcal: 2004 },
};

export const Empty: Story = {
  args: { stepCount: 0, distanceM: 0, exerciseMin: 0, activeKcal: 0, totalKcal: 0 },
};

export const Loading: Story = {
  // skeleton: all zeroes, is-loading class applied
  args: { stepCount: null, distanceM: null, exerciseMin: null, activeKcal: null, totalKcal: null },
};

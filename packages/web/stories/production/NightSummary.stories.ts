import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';

// DS-internal fixture: health/night-summary.json
const meta: Meta = {
  title: 'Production/Health/NightSummary',
  tags: ['stable', 'autodocs'],
  argTypes: {
    sleepScore: { control: 'number' },
    sleepDuration: { control: 'text' },
    deepPct: { control: 'number' },
    remPct: { control: 'number' },
  },
  render: (args) => html`
    <div id="cardSleep" class="tri-card">
      <div class="widget-header">
        <span class="widget-label">Night Summary</span>
      </div>
      <div class="widget-body" style="padding: 16px; color: var(--lg-color-text-primary);">
        <div style="display: flex; align-items: center; gap: 16px;">
          <div style="text-align: center;">
            <div style="font-size: 2.5em; font-weight: bold; color: var(--lg-color-accent-purple);">${args.sleepScore ?? '—'}</div>
            <div style="font-size: 0.75em; color: var(--lg-color-text-muted);">score</div>
          </div>
          <div>
            <div style="font-size: 1.2em;">${args.sleepDuration ?? '—'}</div>
            <div style="font-size: 0.8em; color: var(--lg-color-text-muted);">Deep: ${args.deepPct ?? 0}% · REM: ${args.remPct ?? 0}%</div>
          </div>
        </div>
      </div>
    </div>
  `,
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: { sleepScore: 82, sleepDuration: '7h 18m', deepPct: 19, remPct: 25 },
};

export const Empty: Story = {
  args: { sleepScore: null, sleepDuration: '—', deepPct: 0, remPct: 0 },
};

export const Loading: Story = {
  args: { sleepScore: null, sleepDuration: '—', deepPct: 0, remPct: 0 },
};

export const Dark: Story = {
  ...Default,
  globals: {
    backgrounds: {
      value: "dark"
    }
  },
};

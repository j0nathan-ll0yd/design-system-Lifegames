import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';

// DS-internal fixture: health/heart-rate.json
const meta: Meta = {
  title: 'Production/Health/HeartRate',
  tags: ['stable', 'autodocs'],
  argTypes: {
    heartRate: { control: 'number' },
    hrv: { control: 'number' },
  },
  render: (args) => html`
    <div id="cardHeartRate" class="tri-card">
      <div class="widget-header">
        <span class="widget-label">Heart Rate</span>
      </div>
      <div class="widget-body" style="padding: 16px; color: var(--lg-color-text-primary);">
        <div style="display: flex; gap: 24px; align-items: center;">
          <div>
            <span style="color: var(--lg-color-text-muted); font-size: 0.8em;">Resting BPM</span
            ><br />
            <strong style="font-size: 2em; color: var(--lg-color-accent-red);"
              >${args.heartRate ?? '—'}</strong
            >
          </div>
          <div>
            <span style="color: var(--lg-color-text-muted); font-size: 0.8em;">HRV (SDNN)</span
            ><br />
            <strong style="font-size: 2em; color: var(--lg-color-accent-green);"
              >${args.hrv ?? '—'}</strong
            >
            <span style="font-size: 0.75em; color: var(--lg-color-text-muted);"> ms</span>
          </div>
        </div>
        <canvas
          id="hrEcgCanvas"
          width="300"
          height="60"
          style="width:100%; margin-top: 12px; opacity: 0.6;"
        ></canvas>
      </div>
    </div>
  `,
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: { heartRate: 62, hrv: 48 },
};

export const Empty: Story = {
  args: { heartRate: null, hrv: null },
};

export const Loading: Story = {
  args: { heartRate: null, hrv: null },
};

export const Dark: Story = {
  ...Default,
  globals: {
    backgrounds: {
      value: 'dark',
    },
  },
};

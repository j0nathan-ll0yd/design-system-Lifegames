import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';

// DS-internal fixture: health/hydration.json
const meta: Meta = {
  title: 'Production/Health/Hydration',
  tags: ['stable', 'autodocs'],
  argTypes: {
    waterOz: { control: 'number' },
    waterMax: { control: 'number' },
    caffeineMg: { control: 'number' },
    caffeineMax: { control: 'number' },
  },
  render: (args) => html`
    <div id="cardHydration" class="tri-card">
      <div class="widget-header">
        <span class="widget-label">Hydration</span>
      </div>
      <div class="widget-body" style="padding: 16px; color: var(--lg-color-text-primary);">
        <div style="margin-bottom: 12px;">
          <span style="color: var(--lg-color-text-muted); font-size: 0.8em;">Water</span>
          <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
            <div style="flex: 1; height: 8px; background: var(--lg-color-surface-raised); border-radius: 4px;">
              <div style="width: ${Math.min(100, ((args.waterOz ?? 0) / (args.waterMax ?? 120)) * 100)}%; height: 100%; background: var(--lg-color-accent-blue); border-radius: 4px;"></div>
            </div>
            <strong>${args.waterOz ?? 0} / ${args.waterMax ?? 120} oz</strong>
          </div>
        </div>
        <div>
          <span style="color: var(--lg-color-text-muted); font-size: 0.8em;">Caffeine</span>
          <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
            <div style="flex: 1; height: 8px; background: var(--lg-color-surface-raised); border-radius: 4px;">
              <div style="width: ${Math.min(100, ((args.caffeineMg ?? 0) / (args.caffeineMax ?? 500)) * 100)}%; height: 100%; background: var(--lg-color-accent-amber); border-radius: 4px;"></div>
            </div>
            <strong>${args.caffeineMg ?? 0} / ${args.caffeineMax ?? 500} mg</strong>
          </div>
        </div>
      </div>
    </div>
  `,
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: { waterOz: 64, waterMax: 120, caffeineMg: 180, caffeineMax: 500 },
};

export const Empty: Story = {
  // DS-internal skeleton: health/hydration.skeleton.json
  args: { waterOz: 0, waterMax: 120, caffeineMg: 0, caffeineMax: 500 },
};

export const Loading: Story = {
  args: { waterOz: 0, waterMax: 120, caffeineMg: 0, caffeineMax: 500 },
};

export const Dark: Story = {
  ...Default,
  globals: {
    backgrounds: {
      value: "dark"
    }
  },
};

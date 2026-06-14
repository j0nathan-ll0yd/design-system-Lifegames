import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';

// DS-internal fixture: other/system-status.json
const defaultLines = [
  { key: 'Health', value: 'ACTIVE (7h ago)', valClass: 'sys-val-green', dotClass: 'sys-dot-red' },
  { key: 'Sleep', value: 'ACTIVE (3h ago)', valClass: 'sys-val-green', dotClass: 'sys-dot-purple' },
  { key: 'Books', value: 'ACTIVE (2d ago)', valClass: 'sys-val-green', dotClass: 'sys-dot-amber' },
  {
    key: 'Github Events',
    value: 'ACTIVE (58m ago)',
    valClass: 'sys-val-green',
    dotClass: 'sys-dot-green',
  },
];

const dotColor: Record<string, string> = {
  'sys-dot-green': 'var(--lg-color-accent-green)',
  'sys-dot-red': 'var(--lg-color-accent-red)',
  'sys-dot-purple': 'var(--lg-color-accent-purple)',
  'sys-dot-amber': 'var(--lg-color-accent-amber)',
  'sys-dot-yellow': 'var(--lg-color-accent-amber)',
};

function renderStatus(lines: typeof defaultLines) {
  if (!lines?.length) {
    return html`
      <div id="cardStatus" class="tri-card">
        <div class="widget-header"><span class="widget-label">System Status</span></div>
        <div
          class="widget-body"
          style="padding: 16px; color: var(--lg-color-text-muted); text-align: center;"
        >
          No services configured
        </div>
      </div>
    `;
  }
  return html`
    <div id="cardStatus" class="tri-card">
      <div class="widget-header"><span class="widget-label">System Status</span></div>
      <div
        class="widget-body"
        style="padding: 8px 16px; font-family: monospace; color: var(--lg-color-text-primary);"
      >
        ${lines.map(
          (l) => html`
            <div
              style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 0.85em;"
            >
              <div style="display: flex; align-items: center; gap: 6px;">
                <span
                  style="width: 8px; height: 8px; border-radius: 50%; background: ${dotColor[
                    l.dotClass
                  ] ?? 'var(--lg-color-text-muted)'}; display: inline-block;"
                ></span>
                <span style="color: var(--lg-color-text-muted);">${l.key}</span>
              </div>
              <span style="color: var(--lg-color-accent-green);">${l.value}</span>
            </div>
          `,
        )}
      </div>
    </div>
  `;
}

const meta: Meta = {
  title: 'Production/Other/SystemStatus',
  tags: ['stable', 'autodocs'],
  argTypes: { lines: { control: 'object' } },
  render: (args) => renderStatus(args.lines),
};

export default meta;
type Story = StoryObj;

export const Default: Story = { args: { lines: defaultLines } };
export const Empty: Story = { args: { lines: [] } };
export const Loading: Story = { args: { lines: [] } };

export const Dark: Story = {
  ...Default,
  globals: {
    backgrounds: {
      value: 'dark',
    },
  },
};

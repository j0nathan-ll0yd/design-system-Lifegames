import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';

// DS-internal fixture: other/dnd-overlay.json (empty object — overlay is full-page, no props)
// Synthetic fixture: show overlay with active/inactive state
const meta: Meta = {
  title: 'Production/Other/DndOverlay',
  tags: ['stable', 'autodocs'],
  argTypes: {
    active: { control: 'boolean' },
    label: { control: 'text' },
  },
  render: (args) => html`
    <div
      style="position: relative; height: 200px; border: 1px dashed var(--lg-color-border); border-radius: 8px; overflow: hidden;"
    >
      <div
        id="dndOverlay"
        style="
        position: absolute; inset: 0;
        background: color-mix(in srgb, var(--lg-color-surface) 90%, transparent);
        display: flex; align-items: center; justify-content: center;
        opacity: ${args.active ? '1' : '0.2'};
        transition: opacity 0.3s;
      "
      >
        <div style="text-align: center; color: var(--lg-color-text-primary);">
          <div style="font-size: 2em;">🔕</div>
          <div style="font-size: 0.9em; color: var(--lg-color-text-muted);">
            ${args.label ?? 'Do Not Disturb'}
          </div>
        </div>
      </div>
      ${!args.active
        ? html`<p style="padding: 16px; color: var(--lg-color-text-muted); font-size: 0.85em;">
            Overlay inactive (toggle <em>active</em> to preview)
          </p>`
        : ''}
    </div>
  `,
};

export default meta;
type Story = StoryObj;

export const Default: Story = { args: { active: true, label: 'Do Not Disturb' } };
export const Empty: Story = { args: { active: false, label: '' } };

export const Dark: Story = {
  ...Default,
  globals: {
    backgrounds: {
      value: 'dark',
    },
  },
};

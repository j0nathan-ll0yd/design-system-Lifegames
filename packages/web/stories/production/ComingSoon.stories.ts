import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';

// DS-internal fixture: identity/coming-soon.json (empty object — synthetic below)
const meta: Meta = {
  title: 'Production/Identity/ComingSoon',
  tags: ['stable', 'autodocs'],
  argTypes: {
    label: { control: 'text' },
    dossierYear: { control: 'number' },
  },
  render: (args) => html`
    <div id="cardComingSoon" class="tri-card">
      <div class="widget-header">
        <span class="widget-label">Coming Soon</span>
      </div>
      <div class="widget-body" style="padding: 24px; text-align: center; color: var(--lg-color-text-muted);">
        <p style="font-size: 1.2em; color: var(--lg-color-text-title);">${args.label ?? 'Something new is brewing...'}</p>
        <p id="dossierId" style="font-size: 0.75em; letter-spacing: 0.1em;">CC-${args.dossierYear ?? new Date().getFullYear()}-XXXX</p>
      </div>
    </div>
  `,
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: { label: 'Something new is brewing...', dossierYear: 2026 },
};

export const Empty: Story = {
  args: { label: '', dossierYear: 2026 },
};

export const Dark: Story = {
  ...Default,
  globals: {
    backgrounds: {
      value: "dark"
    }
  },
};

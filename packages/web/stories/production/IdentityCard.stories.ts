import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';

// DS-internal fixture: identity/identity-card.json
const defaultArgs = {
  name: 'Sample User',
  title: 'Engineering Director',
  bio: '100% pure, old fashioned, home-grown human, born free right here in the real world.',
  github: 'https://github.com/devuser-01',
  linkedin: 'https://linkedin.com/in/devuser-01',
};

const meta: Meta = {
  title: 'Production/Identity/IdentityCard',
  tags: ['stable', 'autodocs'],
  argTypes: {
    name: { control: 'text' },
    title: { control: 'text' },
    bio: { control: 'text' },
    github: { control: 'text' },
    linkedin: { control: 'text' },
  },
  render: (args) => html`
    <div id="cardIdentity" class="tri-card">
      <div class="widget-header">
        <span class="widget-label">Identity</span>
      </div>
      <div class="widget-body" style="padding: 16px; color: var(--lg-color-text-primary);">
        ${args.name ? html`<h2 style="margin: 0 0 4px; color: var(--lg-color-text-title);">${args.name}</h2>` : ''}
        <p style="margin: 0 0 8px; color: var(--lg-color-text-muted); font-size: 0.85em;">${args.title}</p>
        <p style="margin: 0 0 12px;">${args.bio}</p>
        <div class="id-links" style="display: flex; gap: 8px;">
          ${args.github ? html`<a href="${args.github}" style="color: var(--lg-color-accent-pink);">GitHub</a>` : ''}
          ${args.linkedin ? html`<a href="${args.linkedin}" style="color: var(--lg-color-accent-blue);">LinkedIn</a>` : ''}
        </div>
      </div>
    </div>
  `,
};

export default meta;
type Story = StoryObj;

export const Default: Story = { args: defaultArgs };

export const Empty: Story = {
  args: { name: '', title: '', bio: '', github: null, linkedin: null },
};

export const Dark: Story = {
  ...Default,
  globals: {
    backgrounds: {
      value: "dark"
    }
  },
};

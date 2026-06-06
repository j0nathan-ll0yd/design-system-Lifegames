import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';

const meta: Meta = {
  title: 'Primitives/Pill',
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' },
    href: { control: 'text' },
  },
  render: (args) => html`
    <style>
      .lg-pill {
        display: inline-block;
        padding: 8px 20px;
        border: 1px solid var(--lg-color-border-subtle);
        border-radius: 9999px;
        color: var(--lg-color-text-primary);
        text-decoration: none;
        font-family: 'Space Grotesk', sans-serif;
        font-size: var(--lg-font-size-sm, 0.8rem);
        font-weight: 500;
        letter-spacing: 2px;
        text-transform: uppercase;
        background: var(--lg-color-surface-inset);
      }
    </style>
    <a href="${args.href || '#'}" class="lg-pill">${args.label || 'GitHub'}</a>
  `,
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: { label: 'GitHub', href: '#' },
};

export const LinkedIn: Story = {
  args: { label: 'LinkedIn', href: '#' },
};

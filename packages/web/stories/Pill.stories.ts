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

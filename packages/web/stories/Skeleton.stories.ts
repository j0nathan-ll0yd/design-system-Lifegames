import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';

const meta: Meta = {
  title: 'Primitives/Skeleton',
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['bar', 'circle'],
    },
    width: { control: 'text' },
    height: { control: 'text' },
  },
  render: (args) => {
    const cls = args.variant === 'circle' ? 'lg-skeleton-circle' : 'lg-skeleton-bar';
    const style = [
      args.width ? `width:${args.width}` : '',
      args.height ? `height:${args.height}` : '',
    ].filter(Boolean).join(';');
    return html`<div class="${cls}" style="${style}" aria-hidden="true"></div>`;
  },
};

export default meta;
type Story = StoryObj;

export const Bar: Story = {
  args: { variant: 'bar', width: '200px', height: '12px' },
};

export const BarWide: Story = {
  args: { variant: 'bar', width: '100%', height: '16px' },
};

export const Circle: Story = {
  args: { variant: 'circle', width: '40px', height: '40px' },
};

export const CircleLarge: Story = {
  args: { variant: 'circle', width: '80px', height: '80px' },
};

import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';

const meta: Meta = {
  title: 'Primitives/PollStatus',
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: { type: 'select' },
      options: ['ok', 'warn', 'error', 'off'],
    },
    label: { control: 'text' },
  },
  render: (args) => html`
    <span class="lg-poll-status">
      <span class="lg-poll-dot lg-poll-dot--${args.status || 'ok'}" aria-hidden="true"></span>
      <span class="lg-poll-label">${args.label || 'LIVE'}</span>
    </span>
  `,
};

export default meta;
type Story = StoryObj;

export const Ok: Story = { args: { status: 'ok', label: 'LIVE' } };
export const Warn: Story = { args: { status: 'warn', label: 'SLOW' } };
export const Error: Story = { args: { status: 'error', label: 'DOWN' } };
export const Off: Story = { args: { status: 'off', label: 'OFF' } };

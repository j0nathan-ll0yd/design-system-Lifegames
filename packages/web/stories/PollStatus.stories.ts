import type {Meta, StoryObj} from '@storybook/web-components-vite'
import {html} from 'lit'

const meta: Meta = {
  title: 'Primitives/PollStatus',
  tags: ['autodocs'],
  argTypes: {status: {control: {type: 'select'}, options: ['ok', 'warn', 'error', 'off']}, label: {control: 'text'}},
  render: (args) =>
    html`
    <style>
      .lg-poll-status {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-family: 'Space Grotesk', monospace;
        font-size: var(--lg-font-size-sm, 0.8rem);
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .lg-poll-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        display: inline-block;
      }
      .lg-poll-dot--ok {
        background: var(--lg-color-accent-green);
        box-shadow: 0 0 6px var(--lg-color-accent-green);
      }
      .lg-poll-dot--warn {
        background: var(--lg-color-accent-amber);
        box-shadow: 0 0 6px var(--lg-color-accent-amber);
      }
      .lg-poll-dot--error {
        background: var(--lg-color-accent-red);
        box-shadow: 0 0 6px var(--lg-color-accent-red);
      }
      .lg-poll-dot--off {
        background: rgba(255, 255, 255, 0.2);
      }
      .lg-poll-label {
        color: rgba(255, 255, 255, 0.6);
      }
    </style>
    <span class="lg-poll-status">
      <span class="lg-poll-dot lg-poll-dot--${args.status || 'ok'}" aria-hidden="true"></span>
      <span class="lg-poll-label">${args.label || 'LIVE'}</span>
    </span>
  `
}

export default meta
type Story = StoryObj

export const Ok: Story = {args: {status: 'ok', label: 'LIVE'}}
export const Warn: Story = {args: {status: 'warn', label: 'SLOW'}}
export const Error: Story = {args: {status: 'error', label: 'DOWN'}}
export const Off: Story = {args: {status: 'off', label: 'OFF'}}

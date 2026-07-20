import type {Meta, StoryObj} from '@storybook/web-components-vite'
import {html} from 'lit'

const meta: Meta = {
  title: 'Primitives/Card',
  tags: ['autodocs'],
  argTypes: {
    accent: {control: {type: 'select'}, options: ['pink', 'green', 'blue', 'purple', 'amber', 'red', 'cyan', 'orange', 'indigo']},
    loading: {control: 'boolean'}
  },
  render: (args) =>
    html`
    <div
      class="lg-card ${args.accent ? `lg-card-accent-${args.accent}` : ''} ${
      args.loading
        ? 'is-loading'
        : ''
    }"
    >
      <div class="widget-header">
        <span class="widget-label">Sample Widget</span>
      </div>
      <div class="widget-body">
        <p style="color: var(--lg-color-text-primary); padding: 16px;">Card content goes here</p>
      </div>
    </div>
  `
}

export default meta
type Story = StoryObj

export const Default: Story = {}

export const AccentPink: Story = {args: {accent: 'pink'}}
export const AccentGreen: Story = {args: {accent: 'green'}}
export const AccentBlue: Story = {args: {accent: 'blue'}}
export const AccentPurple: Story = {args: {accent: 'purple'}}
export const AccentAmber: Story = {args: {accent: 'amber'}}
export const AccentRed: Story = {args: {accent: 'red'}}
export const AccentCyan: Story = {args: {accent: 'cyan'}}
export const AccentOrange: Story = {args: {accent: 'orange'}}
export const AccentIndigo: Story = {args: {accent: 'indigo'}}

export const Loading: Story = {args: {loading: true}}

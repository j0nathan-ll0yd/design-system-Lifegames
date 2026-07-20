import type {Meta, StoryObj} from '@storybook/web-components-vite'
import {html} from 'lit'

const meta: Meta = {
  title: 'Primitives/Modal',
  tags: ['autodocs'],
  argTypes: {visible: {control: 'boolean'}},
  render: (args) =>
    html`
    <div
      class="lg-modal-overlay ${args.visible ? 'visible' : ''}"
      role="dialog"
      aria-modal="true"
      aria-label="Modal"
    >
      <div class="lg-modal">
        <button class="lg-modal-close" aria-label="Close">&times;</button>
        <div class="lg-modal-body">
          <h2 style="color: var(--lg-color-text-title);">Modal Title</h2>
          <p style="color: var(--lg-color-text-muted);">
            Modal content goes here. This is a generic overlay pattern.
          </p>
        </div>
      </div>
    </div>
  `
}

export default meta
type Story = StoryObj

export const Visible: Story = {args: {visible: true}}
export const Hidden: Story = {args: {visible: false}}

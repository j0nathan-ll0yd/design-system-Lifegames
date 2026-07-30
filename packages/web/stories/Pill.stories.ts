import type {Meta, StoryObj} from '@storybook/web-components-vite'
import {html} from 'lit'

const meta: Meta = {
  title: 'Primitives/Pill',
  tags: ['autodocs'],
  argTypes: {label: {control: 'text'}, href: {control: 'text'}},
  // No inline <style> here: .lg-pill comes from
  // packages/web/src/styles/primitives.css, imported once in .storybook/preview.ts.
  // This story used to carry a hand-maintained copy that had already drifted from
  // Pill.astro (literal `8px 20px` instead of the spacing tokens).
  render: (args) => html`<a href="${args.href || '#'}" class="lg-pill">${args.label || 'GitHub'}</a>`
}

export default meta
type Story = StoryObj

export const Default: Story = {args: {label: 'GitHub', href: '#'}}

export const LinkedIn: Story = {args: {label: 'LinkedIn', href: '#'}}

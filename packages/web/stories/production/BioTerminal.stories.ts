import type {Meta, StoryObj} from '@storybook/web-components-vite'
import {html} from 'lit'
import fixture from '../../../../Sources/LifegamesWidgets/Resources/widgets/identity/bio-terminal.json'

// Canonical DS fixture, imported rather than copied so the story cannot drift
// from what the widget consumers actually render (the previous inline copy had
// already drifted to a retired `ls skills/` command set).
const defaultLines = fixture.profile.terminalLines

function renderTerminal(lines: typeof defaultLines) {
  return html`
    <div id="cardBio" class="tri-card">
      <div class="widget-header">
        <span class="widget-label">Bio Terminal</span>
      </div>
      <div
        class="widget-body"
        style="padding: 16px; font-family: monospace; color: var(--lg-color-text-primary);"
      >
        ${
    lines.map((l) => {
      if (l.type === 'prompt') {
        return html`<div style="color: var(--lg-color-accent-green);">${l.text}</div>`
      }
      if (l.type === 'output') {
        return html`<div style="color: var(--lg-color-text-muted);">${l.text}</div>`
      }
      if (l.type === 'cursor') {
        return html`<span class="bio-cursor">▮</span>`
      }
      return html`<div>&nbsp;</div>`
    })
  }
      </div>
    </div>
  `
}

const meta: Meta = {
  title: 'Production/Identity/BioTerminal',
  tags: ['stable', 'autodocs'],
  argTypes: {lines: {control: 'object'}},
  render: (args) => renderTerminal(args.lines ?? [])
}

export default meta
type Story = StoryObj

export const Default: Story = {args: {lines: defaultLines}}

export const Empty: Story = {args: {lines: []}}

export const Loading: Story = {
  // DS-internal skeleton: identity/bio-terminal.skeleton.json (terminalLines: [])
  args: {lines: []}
}

export const Dark: Story = {...Default, globals: {backgrounds: {value: 'dark'}}}

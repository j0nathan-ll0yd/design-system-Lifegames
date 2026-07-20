import type {Meta, StoryObj} from '@storybook/web-components-vite'
import {html} from 'lit'

// DS-internal fixture: location/exploration-odometer-v3.json
const meta: Meta = {
  title: 'Production/Location/ExplorationOdometerV3',
  tags: ['stable', 'autodocs'],
  argTypes: {totalVisits: {control: 'number'}, totalPlaces: {control: 'number'}, citiesVisited: {control: 'number'}, currentCity: {control: 'text'}},
  render: (args) =>
    html`
    <div id="cardOdometer" class="tri-card">
      <div class="widget-header">
        <span class="widget-label">Exploration Odometer</span>
      </div>
      <div class="widget-body" style="padding: 16px; color: var(--lg-color-text-primary);">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div style="text-align: center;">
            <div style="font-size: 2em; font-weight: bold; color: var(--lg-color-accent-cyan);">
              ${args.totalVisits ?? '—'}
            </div>
            <div style="font-size: 0.75em; color: var(--lg-color-text-muted);">Total Visits</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 2em; font-weight: bold; color: var(--lg-color-accent-green);">
              ${args.totalPlaces ?? '—'}
            </div>
            <div style="font-size: 0.75em; color: var(--lg-color-text-muted);">Places</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 2em; font-weight: bold; color: var(--lg-color-accent-blue);">
              ${args.citiesVisited ?? '—'}
            </div>
            <div style="font-size: 0.75em; color: var(--lg-color-text-muted);">Cities</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 1em; font-weight: bold; color: var(--lg-color-accent-pink);">
              ${args.currentCity ?? '—'}
            </div>
            <div style="font-size: 0.75em; color: var(--lg-color-text-muted);">Current City</div>
          </div>
        </div>
      </div>
    </div>
  `
}

export default meta
type Story = StoryObj

export const Default: Story = {args: {totalVisits: 2847, totalPlaces: 312, citiesVisited: 24, currentCity: 'Portland'}}

export const Empty: Story = {args: {totalVisits: 0, totalPlaces: 0, citiesVisited: 0, currentCity: '—'}}

export const Loading: Story = {args: {totalVisits: null, totalPlaces: null, citiesVisited: null, currentCity: null}}

export const Dark: Story = {...Default, globals: {backgrounds: {value: 'dark'}}}

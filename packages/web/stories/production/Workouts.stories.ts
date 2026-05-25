import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';

// DS-internal fixture: health/workouts.json
const defaultWorkouts = [
  { activity_type: 'Outdoor Walk', duration: 2400, energy_burned: 210, distance: 3200 },
  { activity_type: 'Functional Strength Training', duration: 3600, energy_burned: 320, distance: 0 },
];

function renderWorkouts(workouts: typeof defaultWorkouts) {
  if (!workouts?.length) {
    return html`
      <div id="cardWorkouts" class="tri-card">
        <div class="widget-header"><span class="widget-label">Workouts</span></div>
        <div class="widget-body" style="padding: 16px; color: var(--lg-color-text-muted); text-align: center;">No workouts recorded</div>
      </div>
    `;
  }
  return html`
    <div id="cardWorkouts" class="tri-card">
      <div class="widget-header"><span class="widget-label">Workouts</span></div>
      <div class="widget-body" style="padding: 16px; color: var(--lg-color-text-primary);">
        ${workouts.map((w) => html`
          <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--lg-color-border);">
            <span>${w.activity_type}</span>
            <span style="color: var(--lg-color-text-muted); font-size: 0.85em;">${Math.round(w.duration / 60)} min · ${w.energy_burned} kcal</span>
          </div>
        `)}
      </div>
    </div>
  `;
}

const meta: Meta = {
  title: 'Production/Health/Workouts',
  tags: ['autodocs'],
  argTypes: {
    workouts: { control: 'object' },
  },
  render: (args) => renderWorkouts(args.workouts),
};

export default meta;
type Story = StoryObj;

export const Default: Story = { args: { workouts: defaultWorkouts } };

export const Empty: Story = { args: { workouts: [] } };

export const Loading: Story = { args: { workouts: [] } };

import type { Meta, StoryObj } from '@storybook/web-components';
import fixture from '@fixtures/github/dev-activity-pulse.json';

const meta: Meta = {
  title: 'Widgets/GitHub/DevActivityPulse',
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: fixture,
};

import type { Meta, StoryObj } from '@storybook/web-components';
import fixture from '@fixtures/github/weekly-pulse.json';

const meta: Meta = {
  title: 'Widgets/GitHub/WeeklyPulse',
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: fixture,
};

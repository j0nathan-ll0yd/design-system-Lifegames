import type { Meta, StoryObj } from '@storybook/web-components';
import fixture from '@fixtures/github/contribution-calendar.json';

const meta: Meta = {
  title: 'Widgets/GitHub/ContributionCalendar',
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: fixture,
};

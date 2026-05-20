import type { Meta, StoryObj } from '@storybook/web-components';
import fixture from '@fixtures/github/activity-feed.json';

const meta: Meta = {
  title: 'Widgets/GitHub/ActivityFeed',
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: fixture,
};

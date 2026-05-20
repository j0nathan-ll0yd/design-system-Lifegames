import type { Meta, StoryObj } from '@storybook/web-components';
import fixture from '@fixtures/github/streak-counter.json';

const meta: Meta = {
  title: 'Widgets/GitHub/StreakCounter',
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: fixture,
};

import type { Meta, StoryObj } from '@storybook/web-components';
import fixture from '@fixtures/github/contribution-breakdown.json';

const meta: Meta = {
  title: 'Widgets/GitHub/ContributionBreakdown',
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: fixture,
};

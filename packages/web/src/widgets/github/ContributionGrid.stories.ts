import type { Meta, StoryObj } from '@storybook/web-components';
import fixture from '@fixtures/github/contribution-grid.json';

const meta: Meta = {
  title: 'Widgets/GitHub/ContributionGrid',
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: fixture,
};

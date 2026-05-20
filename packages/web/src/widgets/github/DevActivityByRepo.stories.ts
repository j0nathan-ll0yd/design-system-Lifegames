import type { Meta, StoryObj } from '@storybook/web-components';
import fixture from '@fixtures/github/dev-activity-by-repo.json';

const meta: Meta = {
  title: 'Widgets/GitHub/DevActivityByRepo',
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: fixture,
};

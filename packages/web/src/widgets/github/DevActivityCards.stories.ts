import type { Meta, StoryObj } from '@storybook/web-components';
import fixture from '@fixtures/github/dev-activity-cards.json';

const meta: Meta = {
  title: 'Widgets/GitHub/DevActivityCards',
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: fixture,
};

import type { Meta, StoryObj } from '@storybook/web-components';
import fixture from '@fixtures/github/dev-activity-log.json';

const meta: Meta = {
  title: 'Widgets/GitHub/DevActivityLog',
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: fixture,
};

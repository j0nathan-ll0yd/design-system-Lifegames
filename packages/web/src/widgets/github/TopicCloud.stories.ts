import type { Meta, StoryObj } from '@storybook/web-components';
import fixture from '@fixtures/github/topic-cloud.json';

const meta: Meta = {
  title: 'Widgets/GitHub/TopicCloud',
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: fixture,
};

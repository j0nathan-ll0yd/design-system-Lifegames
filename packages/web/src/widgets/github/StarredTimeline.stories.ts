import type { Meta, StoryObj } from '@storybook/web-components';
import fixture from '@fixtures/github/starred-timeline.json';

const meta: Meta = {
  title: 'Widgets/GitHub/StarredTimeline',
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: fixture,
};

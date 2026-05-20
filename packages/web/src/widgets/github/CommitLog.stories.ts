import type { Meta, StoryObj } from '@storybook/web-components';
import fixture from '@fixtures/github/commit-log.json';

const meta: Meta = {
  title: 'Widgets/GitHub/CommitLog',
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: fixture,
};

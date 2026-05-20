import type { Meta, StoryObj } from '@storybook/web-components';
import fixture from '@fixtures/github/pinned-repos.json';

const meta: Meta = {
  title: 'Widgets/GitHub/PinnedRepos',
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: fixture,
};

import type { Meta, StoryObj } from '@storybook/web-components';
import fixture from '@fixtures/github/top-repos.json';

const meta: Meta = {
  title: 'Widgets/GitHub/TopRepos',
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: fixture,
};

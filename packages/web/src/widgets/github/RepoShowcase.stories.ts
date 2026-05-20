import type { Meta, StoryObj } from '@storybook/web-components';
import fixture from '@fixtures/github/repo-showcase.json';

const meta: Meta = {
  title: 'Widgets/GitHub/RepoShowcase',
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: fixture,
};

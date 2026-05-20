import type { Meta, StoryObj } from '@storybook/web-components';
import fixture from '@fixtures/github/code-velocity.json';

const meta: Meta = {
  title: 'Widgets/GitHub/CodeVelocity',
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: fixture,
};

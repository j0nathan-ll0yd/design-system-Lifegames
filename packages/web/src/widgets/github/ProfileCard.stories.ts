import type { Meta, StoryObj } from '@storybook/web-components';
import fixture from '@fixtures/github/profile-card.json';

const meta: Meta = {
  title: 'Widgets/GitHub/ProfileCard',
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: fixture,
};

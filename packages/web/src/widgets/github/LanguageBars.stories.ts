import type { Meta, StoryObj } from '@storybook/web-components';
import fixture from '@fixtures/github/language-bars.json';

const meta: Meta = {
  title: 'Widgets/GitHub/LanguageBars',
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: fixture,
};

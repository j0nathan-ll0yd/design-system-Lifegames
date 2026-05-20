import type { Meta, StoryObj } from '@storybook/web-components';
import fixture from '@fixtures/github/language-stack.json';

const meta: Meta = {
  title: 'Widgets/GitHub/LanguageStack',
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: fixture,
};

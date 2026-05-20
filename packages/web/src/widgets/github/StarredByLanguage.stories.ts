import type { Meta, StoryObj } from '@storybook/web-components';
import fixture from '@fixtures/github/starred-by-language.json';

const meta: Meta = {
  title: 'Widgets/GitHub/StarredByLanguage',
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: fixture,
};

import type { Meta, StoryObj } from '@storybook/web-components';
import data from '@fixtures/reading/bookshelf.json';

const meta: Meta = {
  title: 'Widgets/Reading/Bookshelf',
  tags: ['autodocs'],
};

export default meta;

export const Default: StoryObj = {
  args: data,
};

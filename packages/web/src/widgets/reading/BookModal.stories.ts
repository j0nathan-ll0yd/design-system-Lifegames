import type { Meta, StoryObj } from '@storybook/web-components';
import data from '@fixtures/reading/book-modal.json';

const meta: Meta = {
  title: 'Widgets/Reading/BookModal',
  tags: ['autodocs'],
};

export default meta;

export const Default: StoryObj = {
  args: data,
};

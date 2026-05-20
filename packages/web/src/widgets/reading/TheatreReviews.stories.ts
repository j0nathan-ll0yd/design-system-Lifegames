import type { Meta, StoryObj } from '@storybook/web-components';
import data from '@fixtures/reading/theatre-reviews.json';

const meta: Meta = {
  title: 'Widgets/Reading/TheatreReviews',
  tags: ['autodocs'],
};

export default meta;

export const Default: StoryObj = {
  args: data,
};

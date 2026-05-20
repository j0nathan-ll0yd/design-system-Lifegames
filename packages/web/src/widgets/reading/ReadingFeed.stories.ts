import type { Meta, StoryObj } from '@storybook/web-components';
import data from '@fixtures/reading/reading-feed.json';

const meta: Meta = {
  title: 'Widgets/Reading/ReadingFeed',
  tags: ['autodocs'],
};

export default meta;

export const Default: StoryObj = {
  args: data,
};

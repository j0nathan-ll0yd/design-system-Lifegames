import type { Meta, StoryObj } from '@storybook/web-components';
import data from '@fixtures/health/heart-rate.json';

const meta: Meta = {
  title: 'Widgets/Health/HeartRate',
  tags: ['autodocs'],
};

export default meta;

export const Default: StoryObj = {
  args: data,
};

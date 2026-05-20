import type { Meta, StoryObj } from '@storybook/web-components';
import data from '@fixtures/health/workouts.json';

const meta: Meta = {
  title: 'Widgets/Health/Workouts',
  tags: ['autodocs'],
};

export default meta;

export const Default: StoryObj = {
  args: data,
};

import type { Meta, StoryObj } from '@storybook/web-components';
import data from '@fixtures/health/daily-activity.json';

const meta: Meta = {
  title: 'Widgets/Health/DailyActivity',
  tags: ['autodocs'],
};

export default meta;

export const Default: StoryObj = {
  args: data,
};

import type { Meta, StoryObj } from '@storybook/web-components';
import data from '@fixtures/health/night-summary.json';

const meta: Meta = {
  title: 'Widgets/Health/NightSummary',
  tags: ['autodocs'],
};

export default meta;

export const Default: StoryObj = {
  args: data,
};

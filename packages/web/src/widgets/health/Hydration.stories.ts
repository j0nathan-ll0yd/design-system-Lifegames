import type { Meta, StoryObj } from '@storybook/web-components';
import data from '@fixtures/health/hydration.json';

const meta: Meta = {
  title: 'Widgets/Health/Hydration',
  tags: ['autodocs'],
};

export default meta;

export const Default: StoryObj = {
  args: data,
};

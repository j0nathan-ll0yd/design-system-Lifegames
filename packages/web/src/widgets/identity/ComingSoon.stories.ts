import type { Meta, StoryObj } from '@storybook/web-components';
import data from '@fixtures/identity/coming-soon.json';

const meta: Meta = {
  title: 'Widgets/Identity/ComingSoon',
  tags: ['autodocs'],
};

export default meta;

export const Default: StoryObj = {
  args: data,
};

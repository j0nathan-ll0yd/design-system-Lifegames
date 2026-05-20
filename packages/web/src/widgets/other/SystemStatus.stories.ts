import type { Meta, StoryObj } from '@storybook/web-components';
import data from '@fixtures/other/system-status.json';

const meta: Meta = {
  title: 'Widgets/Other/SystemStatus',
  tags: ['autodocs'],
};

export default meta;

export const Default: StoryObj = {
  args: data,
};

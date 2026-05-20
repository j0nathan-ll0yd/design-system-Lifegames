import type { Meta, StoryObj } from '@storybook/web-components';
import data from '@fixtures/other/og-image.json';

const meta: Meta = {
  title: 'Widgets/Other/OGImage',
  tags: ['autodocs'],
};

export default meta;

export const Default: StoryObj = {
  args: data,
};

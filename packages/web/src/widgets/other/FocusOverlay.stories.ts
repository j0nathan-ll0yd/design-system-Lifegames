import type { Meta, StoryObj } from '@storybook/web-components';
import data from '@fixtures/other/focus-overlay.json';

const meta: Meta = {
  title: 'Widgets/Other/FocusOverlay',
  tags: ['autodocs'],
};

export default meta;

export const Default: StoryObj = {
  args: data,
};

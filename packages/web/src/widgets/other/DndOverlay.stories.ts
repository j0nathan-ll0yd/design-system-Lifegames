import type { Meta, StoryObj } from '@storybook/web-components';
import data from '@fixtures/other/dnd-overlay.json';

const meta: Meta = {
  title: 'Widgets/Other/DndOverlay',
  tags: ['autodocs'],
};

export default meta;

export const Default: StoryObj = {
  args: data,
};

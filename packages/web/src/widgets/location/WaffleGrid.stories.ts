import type { Meta, StoryObj } from '@storybook/web-components';
import fixture from '@fixtures/location/waffle-grid.json';

const meta: Meta = {
  title: 'Widgets/Location/WaffleGrid',
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: fixture,
};

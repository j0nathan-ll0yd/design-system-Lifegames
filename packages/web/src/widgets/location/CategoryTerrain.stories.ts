import type { Meta, StoryObj } from '@storybook/web-components';
import fixture from '@fixtures/location/category-terrain.json';

const meta: Meta = {
  title: 'Widgets/Location/CategoryTerrain',
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: fixture,
};

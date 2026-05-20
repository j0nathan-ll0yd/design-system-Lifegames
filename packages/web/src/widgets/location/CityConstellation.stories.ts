import type { Meta, StoryObj } from '@storybook/web-components';
import fixture from '@fixtures/location/city-constellation.json';

const meta: Meta = {
  title: 'Widgets/Location/CityConstellation',
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: fixture,
};

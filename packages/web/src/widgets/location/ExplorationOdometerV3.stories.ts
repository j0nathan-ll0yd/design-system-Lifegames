import type { Meta, StoryObj } from '@storybook/web-components';
import fixture from '@fixtures/location/exploration-odometer-v3.json';

const meta: Meta = {
  title: 'Widgets/Location/ExplorationOdometerV3',
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: fixture,
};

import type { Meta, StoryObj } from '@storybook/web-components';
import fixture from '@fixtures/location/exploration-rings.json';

const meta: Meta = {
  title: 'Widgets/Location/ExplorationRings',
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: fixture,
};

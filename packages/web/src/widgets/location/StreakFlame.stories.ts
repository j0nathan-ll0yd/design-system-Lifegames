import type { Meta, StoryObj } from '@storybook/web-components';
import fixture from '@fixtures/location/streak-flame.json';

const meta: Meta = {
  title: 'Widgets/Location/StreakFlame',
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: fixture,
};

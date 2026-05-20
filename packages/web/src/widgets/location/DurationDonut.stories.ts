import type { Meta, StoryObj } from '@storybook/web-components';
import fixture from '@fixtures/location/duration-donut.json';

const meta: Meta = {
  title: 'Widgets/Location/DurationDonut',
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: fixture,
};

import type { Meta, StoryObj } from '@storybook/web-components';
import fixture from '@fixtures/location/rhythm-bars.json';

const meta: Meta = {
  title: 'Widgets/Location/RhythmBars',
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj;

export const Default: Story = {
  args: fixture,
};

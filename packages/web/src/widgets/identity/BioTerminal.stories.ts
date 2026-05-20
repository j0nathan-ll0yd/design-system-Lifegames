import type { Meta, StoryObj } from '@storybook/web-components';
import data from '@fixtures/identity/bio-terminal.json';

const meta: Meta = {
  title: 'Widgets/Identity/BioTerminal',
  tags: ['autodocs'],
};

export default meta;

export const Default: StoryObj = {
  args: data,
};

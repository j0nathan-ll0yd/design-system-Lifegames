import type { Meta, StoryObj } from '@storybook/web-components';
import data from '@fixtures/identity/identity-card.json';

const meta: Meta = {
  title: 'Widgets/Identity/IdentityCard',
  tags: ['autodocs'],
};

export default meta;

export const Default: StoryObj = {
  args: data,
};

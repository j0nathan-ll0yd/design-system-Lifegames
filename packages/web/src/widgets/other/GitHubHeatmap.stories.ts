import type { Meta, StoryObj } from '@storybook/web-components';
import data from '@fixtures/other/github-heatmap.json';

const meta: Meta = {
  title: 'Widgets/Other/GitHubHeatmap',
  tags: ['autodocs'],
};

export default meta;

export const Default: StoryObj = {
  args: data,
};

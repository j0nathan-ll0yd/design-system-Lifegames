import '@lifegames/tokens/css';
import '@lifegames/tokens/animations';
import '@lifegames/tokens/shadcn';
import type { Preview } from '@storybook/web-components';

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#06060f' },
        { name: 'light', value: '#ffffff' },
      ],
    },
    a11y: {
      config: {},
    },
  },
  tags: ['autodocs'],
};

export default preview;

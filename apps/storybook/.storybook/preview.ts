import '@lifegames/tokens/css';
import '@lifegames/tokens/animations';
import '@lifegames/tokens/shadcn';
import type { Preview } from '@storybook/web-components-vite';

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
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo'
    },
  },
  tags: ['autodocs'],
};

export default preview;

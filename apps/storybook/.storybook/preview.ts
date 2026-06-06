import '@lifegames/tokens/css';
import '@lifegames/tokens/compat';
import '@lifegames/tokens/components';
import '@lifegames/tokens/animations';
import '@lifegames/tokens/shadcn';
import type { Preview } from '@storybook/web-components-vite';
import { html } from 'lit';

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
      config: {
        rules: [
          { id: 'region', enabled: false },
        ],
      },
      test: 'error',
    },
  },
  decorators: [
    (story) => html`<div style="background-color: #06060f; padding: 16px;">${story()}</div>`,
  ],
  tags: ['autodocs'],
};

export default preview;

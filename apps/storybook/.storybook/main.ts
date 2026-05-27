import type { StorybookConfig } from '@storybook/web-components-vite';

const config: StorybookConfig = {
  stories: [
    '../src/**/*.stories.{ts,tsx}',
    '../../../packages/web/src/widgets/**/*.stories.{ts,tsx}',
    '../../../packages/web/stories/**/*.stories.{ts,js}',
  ],
  addons: [
    '@storybook/addon-a11y',
    '@storybook/addon-vitest',
  ],
  framework: {
    name: '@storybook/web-components-vite',
    options: {},
  },
};

export default config;

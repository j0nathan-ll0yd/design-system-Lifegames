import type { StorybookConfig } from '@storybook/web-components-vite';

const config: StorybookConfig = {
  // Primitives only — widget docs live at /widgets/<category>/<name>/ via Astro Starlight
  stories: ['../../../packages/web/stories/**/*.stories.{ts,js}'],
  addons: ['@storybook/addon-essentials'],
  framework: {
    name: '@storybook/web-components-vite',
    options: {},
  },
};

export default config;

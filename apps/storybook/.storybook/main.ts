import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import type { StorybookConfig } from '@storybook/web-components-vite';

const config: StorybookConfig = {
  stories: [
    '../src/**/*.stories.{ts,tsx}',
    '../../../packages/web/src/widgets/**/*.stories.{ts,tsx}',
    '../../../packages/web/stories/**/*.stories.{ts,js}',
  ],
  addons: [
    getAbsolutePath("@storybook/addon-a11y"),
    getAbsolutePath("@storybook/addon-vitest"),
  ],
  framework: {
    name: getAbsolutePath("@storybook/web-components-vite"),
    options: {},
  },
};

export default config;

function getAbsolutePath(value: string): any {
  return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}

import {fileURLToPath} from 'node:url'
import {dirname} from 'node:path'
import type {StorybookConfig} from '@storybook/web-components-vite'

const config: StorybookConfig = {
  stories: [
    '../src/**/*.stories.{ts,tsx}',
    '../../../packages/web/src/widgets/**/*.stories.{ts,tsx}',
    '../../../packages/web/stories/**/*.stories.{ts,js}'
  ],
  // fonts.css (the tokens package `fonts` entrypoint, imported in preview.ts)
  // loads Space Grotesk from absolute /fonts/*.woff2 URLs, so every consumer
  // serves that directory. apps/docs/public/fonts is the copy the docs app serves
  // for the same entrypoint (astro.config.mjs). Without it the brand face falls
  // back to the runner's system fonts, which is not what production draws.
  staticDirs: [{from: '../../docs/public/fonts', to: '/fonts'}],
  addons: [getAbsolutePath('@storybook/addon-a11y'), getAbsolutePath('@storybook/addon-vitest')],
  framework: {name: getAbsolutePath('@storybook/web-components-vite'), options: {}}
}

export default config

function getAbsolutePath(value: string): any {
  return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)))
}

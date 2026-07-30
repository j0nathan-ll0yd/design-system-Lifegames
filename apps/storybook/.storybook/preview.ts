import '@lifegames/tokens/css'
import '@lifegames/tokens/compat'
import '@lifegames/tokens/components'
import '@lifegames/tokens/animations'
import '@lifegames/tokens/shadcn'
// Primitive component CSS. Stories hand-render the markup with lit rather than
// mounting the .astro components, so without this the primitives render
// unstyled — see the header comment in packages/web/src/styles/primitives.css.
import '@lifegames/web/styles/primitives.css'
import type {Preview} from '@storybook/web-components-vite'
import {html} from 'lit'

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'dark',
      values: [
        {name: 'dark', value: '#06060f'},
        {name: 'light', value: '#ffffff'}
      ]
    },
    a11y: {config: {rules: [{id: 'region', enabled: false}]}, test: 'error'}
  },
  decorators: [
    // data-widget-preview is load-bearing, not cosmetic: components.css gives
    // .tri-card `opacity: 0` until client JS adds `.visible`, and that JS never
    // runs in Storybook. compat.css's unlayered `[data-widget-preview] .tri-card`
    // rule is the sanctioned static-render escape hatch, but it needs this
    // ancestor attribute to match. Without it every .tri-card story renders
    // fully transparent — that is how 52 baselines were minted blank (#123).
    (story) => html`<div data-widget-preview style="background-color: #06060f; padding: 16px;">${story()}</div>`
  ],
  tags: ['autodocs']
}

export default preview

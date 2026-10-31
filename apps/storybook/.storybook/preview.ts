import '@j0nathan-ll0yd/tokens/css'
// Space Grotesk @font-face rules, as production consumers load them. The files
// come from staticDirs in main.ts; test-runner.mjs waits for them to load.
import '@j0nathan-ll0yd/tokens/fonts'
import '@j0nathan-ll0yd/tokens/compat'
import '@j0nathan-ll0yd/web/styles/components.css'
import '@j0nathan-ll0yd/tokens/animations'
import '@j0nathan-ll0yd/tokens/shadcn'
// Primitive component CSS. Stories hand-render the markup with lit rather than
// mounting the .astro components, so without this the primitives render
// unstyled — see the header comment in packages/web/src/styles/primitives.css.
import '@j0nathan-ll0yd/web/styles/primitives.css'
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
    //
    // The font family mirrors the production page body (`html, body` in
    // apps/portfolio/src/layouts/Dashboard.astro): without it, text with no
    // family of its own renders in the browser default serif.
    (story) => html`<div data-widget-preview style="background-color: #06060f; padding: 16px; font-family: var(--lg-font-family-brand);">${story()}</div>`
  ],
  tags: ['autodocs']
}

export default preview

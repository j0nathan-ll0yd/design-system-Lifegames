// The website's stylesheet set, in its order, so the visual gate measures the render
// production ships: j0nathan-ll0yd.github.io src/layouts/Dashboard.astro:294-302 and
// :428. scripts/storybook-stylesheet-set.test.mjs pins this list.
// The fonts entrypoint needs the files from staticDirs in main.ts; test-runner.mjs
// waits for them to load. The reset is unlayered, as on the website: it sets
// box-sizing: border-box on every element and zeroes margins and list styles, so a
// story draws the boxes production draws.
import '@j0nathan-ll0yd/tokens/preamble'
import '@j0nathan-ll0yd/tokens/fonts'
import '@j0nathan-ll0yd/tokens/css.layered'
import '@j0nathan-ll0yd/tokens/compat'
import '@j0nathan-ll0yd/web/styles/components.css'
import '@j0nathan-ll0yd/tokens/effects'
import '@j0nathan-ll0yd/tokens/reset'
import '@j0nathan-ll0yd/web/styles/a11y.css'
import '@j0nathan-ll0yd/web/styles/view-transitions.css'
import '@j0nathan-ll0yd/web/styles/layout.css'
// Two files the website layout does not load, because stories need them:
// - tokens/shadcn: the OKLCH variables that src/integration/shadcn.stories.ts verifies.
//   No widget reads them.
// - primitives.css: stories hand-render primitive markup with lit rather than mounting
//   the .astro components, which import this file themselves on the website. See the
//   header comment in packages/web/src/styles/primitives.css.
import '@j0nathan-ll0yd/tokens/shadcn'
import '@j0nathan-ll0yd/web/styles/primitives.css'
import type {Preview} from '@storybook/web-components-vite'
import {html} from 'lit'
import {INITIAL_BACKGROUND, STORY_BACKGROUNDS} from './story-backgrounds.mjs'

const preview: Preview = {
  parameters: {
    // Storybook 10 shape; see story-backgrounds.mjs for why `values` no longer works.
    backgrounds: {options: STORY_BACKGROUNDS},
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
    (story) =>
      html`<div data-widget-preview style="background-color: ${STORY_BACKGROUNDS.dark.value}; padding: 16px; font-family: var(--lg-font-family-brand);">${story()}</div>`
  ],
  initialGlobals: {backgrounds: {value: INITIAL_BACKGROUND}},
  tags: ['autodocs']
}

export default preview

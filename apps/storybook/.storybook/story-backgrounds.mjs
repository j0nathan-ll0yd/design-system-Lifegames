/* Story page backgrounds, in the Storybook 10 `options` shape. preview.ts hands
   them to the backgrounds addon, and test-runner.mjs derives the content
   sentinel's two background colours from them, so a story's page colour is
   always one the sentinel discounts.

   Storybook 10 reads `parameters.backgrounds.options`. It ignores the legacy
   `values` array and falls back to its own defaults, where `dark` is #333 (see
   DEFAULT_BACKGROUNDS in storybook/dist/preview/runtime.js). Under that fallback
   the 19 `globals: {backgrounds: {value: 'dark'}}` stories painted the page
   #333, the sentinel counted the whole page as content (about 95%), and neither
   the sentinel nor the swing check could see a blank story. */
export const STORY_BACKGROUNDS = {
  // The widget surface: the decorator paints it behind every story.
  dark: {name: 'dark', value: '#06060f'},
  // The page around the decorator in every story without a backgrounds global.
  light: {name: 'light', value: '#ffffff'}
}

// `light` reproduces the white page that default stories render on, so only the
// stories that ask for `dark` change.
export const INITIAL_BACKGROUND = 'light'

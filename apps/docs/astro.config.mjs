import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightLlmsTxt from 'starlight-llms-txt';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  site: 'https://design.lifegames.org',
  redirects: {
    '/': '/getting-started/',
  },
  integrations: [
    starlight({
      plugins: [
        starlightLlmsTxt({
          projectName: 'Lifegames Design System',
          description:
            'Unified cross-platform design system powering the Lifegames portfolio — a single source of truth for tokens, components, and widgets across web (Astro) and iOS (SwiftUI).',
        }),
      ],
      title: 'Lifegames Design System',
      head: [
        {
          tag: 'script',
          content:
            '(function(){if(typeof localStorage!=="undefined"&&!localStorage.getItem("starlight-theme")){localStorage.setItem("starlight-theme","dark")}})();',
        },
      ],
      customCss: [
        // Public cascade-layer contract MUST load first — declares @layer lifegames, site;
        '../../packages/tokens/src/preamble.css',
        // Layered tokens variant (wrapped in @layer lifegames > tokens)
        '../../packages/tokens/dist/tokens-layered.css',
        // Source CSS files (all wrapped in @layer lifegames > <name> as of Step 5)
        '../../packages/tokens/src/fonts.css',
        '../../packages/tokens/src/compat.css',
        '../../packages/tokens/src/components.css',
        '../../packages/tokens/src/effects.css',
        '../../packages/tokens/src/layout.css',
        '../../packages/tokens/src/base.css',
        // Web package styles (intentionally unlayered — overrides DS defaults)
        '../../packages/web/src/styles/a11y.css',
        // Brand guide page styles
        './src/styles/brand.css',
      ],
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/j0nathan-ll0yd/design-system-Lifegames',
        },
      ],
      sidebar: [
        {
          label: 'Production',
          items: [
            {
              label: 'Live Site (jonathanlloyd.me)',
              link: 'https://jonathanlloyd.me',
              attrs: { target: '_blank', rel: 'noopener' },
            },
            { label: 'Local Showcase', link: '/showcase/' },
          ],
        },
        { label: 'Getting Started', items: [{ autogenerate: { directory: '.' } }] },
        { label: 'Brand', items: [{ autogenerate: { directory: 'brand' } }] },
        { label: 'Tokens', items: [{ autogenerate: { directory: 'tokens' } }] },
        { label: 'Components', items: [{ autogenerate: { directory: 'components' } }] },
        {
          label: 'Widgets',
          items: [
            { label: 'IdentityCard', link: '/widgets/identity-card/' },
            { label: 'BioTerminal', link: '/widgets/bio-terminal/' },
            { label: 'SystemStatus', link: '/widgets/system-status/' },
            { label: 'HeartRate', link: '/widgets/heart-rate/' },
            { label: 'Workouts', link: '/widgets/workouts/' },
            { label: 'Hydration', link: '/widgets/hydration/' },
            { label: 'NightSummary', link: '/widgets/night-summary/' },
            { label: 'DevActivityLog', link: '/widgets/dev-activity-log/' },
            { label: 'ReadingFeed', link: '/widgets/reading-feed/' },
            { label: 'StarredRepoList', link: '/widgets/starred-repo-list/' },
            { label: 'Bookshelf', link: '/widgets/bookshelf/' },
            { label: 'TheatreReviews', link: '/widgets/theatre-reviews/' },
            { label: 'PlaceLeaderboardV3', link: '/widgets/place-leaderboard-v3/', badge: 'Dev' },
            {
              label: 'ExplorationOdometerV3',
              link: '/widgets/exploration-odometer-v3/',
              badge: 'Dev',
            },
            { label: 'All Alternates', link: '/alternates/' },
          ],
        },
        {
          label: 'Alternates',
          collapsed: true,
          items: [
            {
              label: 'GitHub',
              collapsed: true,
              items: [
                { label: 'ActivityFeed', link: '/alternates/github/activity-feed/' },
                { label: 'CommitLog', link: '/alternates/github/commit-log/' },
                { label: 'CommitTimeline', link: '/alternates/github/commit-timeline/' },
                { label: 'DevActivityCards', link: '/alternates/github/dev-activity-cards/' },
                { label: 'DevActivityTimeline', link: '/alternates/github/dev-activity-timeline/' },
                { label: 'LanguageBars', link: '/alternates/github/language-bars/' },
                { label: 'LanguageStack', link: '/alternates/github/language-stack/' },
                { label: 'PinnedRepos', link: '/alternates/github/pinned-repos/' },
                { label: 'WeeklyPulse', link: '/alternates/github/weekly-pulse/' },
              ],
            },
            {
              label: 'Reading',
              collapsed: true,
              items: [{ label: 'BookModal', link: '/alternates/reading/book-modal/' }],
            },
            {
              label: 'Identity',
              collapsed: true,
              items: [{ label: 'ComingSoon', link: '/alternates/identity/coming-soon/' }],
            },
            {
              label: 'Other',
              collapsed: true,
              items: [
                { label: 'DndOverlay', link: '/alternates/other/dnd-overlay/' },
                { label: 'FocusOverlay', link: '/alternates/other/focus-overlay/' },
                { label: 'GitHubHeatmap', link: '/alternates/other/git-hub-heatmap/' },
                { label: 'OGImage', link: '/alternates/other/og-image/' },
              ],
            },
          ],
        },
      ],
    }),
  ],
  vite: {
    resolve: {
      alias: {
        '@manifest': path.resolve(
          __dirname,
          '../../Sources/LifegamesWidgets/Resources/widgets/widget-manifest.json',
        ),
        '@widgets': path.resolve(__dirname, '../../packages/web/src/widgets'),
        '@components': path.resolve(__dirname, '../../packages/web/src/components'),
        '@fixtures': path.resolve(__dirname, '../../Sources/LifegamesWidgets/Resources/widgets'),
        '@islands': path.resolve(__dirname, '../../packages/web/src/islands'),
        '@runtime': path.resolve(__dirname, '../../packages/web/src/runtime'),
      },
    },
  },
});

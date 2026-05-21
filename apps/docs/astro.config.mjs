import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  integrations: [
    starlight({
      title: 'Lifegames Design System',
      head: [
        {
          tag: 'script',
          content: '(function(){if(typeof localStorage!=="undefined"&&!localStorage.getItem("starlight-theme")){localStorage.setItem("starlight-theme","dark")}})();',
        },
      ],
      customCss: [
        '../../packages/tokens/src/fonts.css',
        '../../packages/tokens/dist/tokens.css',
        '../../packages/tokens/src/compat.css',
        '../../packages/tokens/src/components.css',
        '../../packages/tokens/src/effects.css',
        '../../packages/tokens/src/layout.css',
        '../../packages/tokens/src/base.css',
        '../../packages/web/src/styles/a11y.css',
      ],
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/j0nathan-ll0yd/lifegames-design-system' },
      ],
      sidebar: [
        { label: 'Getting Started', autogenerate: { directory: '.' } },
        { label: 'Tokens', autogenerate: { directory: 'tokens' } },
        { label: 'Components', autogenerate: { directory: 'components' } },
        {
          label: 'Widgets',
          items: [
            { label: 'IdentityCard', link: '/widgets/identity-card/' },
            { label: 'BioTerminal', link: '/widgets/bio-terminal/' },
            { label: 'SystemStatus', link: '/widgets/system-status/' },
            { label: 'HeartRate', link: '/widgets/heart-rate/' },
            { label: 'DailyActivity', link: '/widgets/daily-activity/' },
            { label: 'Workouts', link: '/widgets/workouts/' },
            { label: 'Hydration', link: '/widgets/hydration/' },
            { label: 'NightSummary', link: '/widgets/night-summary/' },
            { label: 'DevActivityLog', link: '/widgets/dev-activity-log/' },
            { label: 'ReadingFeed', link: '/widgets/reading-feed/' },
            { label: 'StarredRepoList', link: '/widgets/starred-repo-list/' },
            { label: 'Bookshelf', link: '/widgets/bookshelf/' },
            { label: 'TheatreReviews', link: '/widgets/theatre-reviews/' },
            { label: 'PlaceLeaderboardV3', link: '/widgets/place-leaderboard-v3/', badge: 'Dev' },
            { label: 'ExplorationOdometerV3', link: '/widgets/exploration-odometer-v3/', badge: 'Dev' },
            { label: 'All Alternates', link: '/alternates/' },
          ],
        },
      ],
    }),
  ],
  vite: {
    resolve: {
      alias: {
        '@manifest': path.resolve(__dirname, '../../Sources/LifegamesWidgets/Resources/widgets/widget-manifest.json'),
        '@widgets': path.resolve(__dirname, '../../packages/web/src/widgets'),
        '@fixtures': path.resolve(__dirname, '../../Sources/LifegamesWidgets/Resources/widgets'),
        '@islands': path.resolve(__dirname, '../../packages/web/src/islands'),
        '@runtime': path.resolve(__dirname, '../../packages/web/src/runtime'),
      },
    },
  },
});

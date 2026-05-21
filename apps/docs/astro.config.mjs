import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  integrations: [
    starlight({
      title: 'Lifegames Design System',
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
        { label: 'Widgets', autogenerate: { directory: 'widgets' } },
      ],
    }),
  ],
  vite: {
    resolve: {
      alias: {
        '@manifest': path.resolve(__dirname, '../../Sources/LifegamesWidgets/Resources/widgets/widget-manifest.json'),
        '@widgets': path.resolve(__dirname, '../../packages/web/src/widgets'),
        '@fixtures': path.resolve(__dirname, '../../Sources/LifegamesWidgets/Resources/widgets'),
      },
    },
  },
});

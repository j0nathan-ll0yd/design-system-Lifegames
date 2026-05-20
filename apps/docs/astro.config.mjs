import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  integrations: [
    starlight({
      title: 'Lifegames Design System',
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
});

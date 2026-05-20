import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  integrations: [
    starlight({
      title: 'Lifegames Design System',
      social: {
        github: 'https://github.com/j0nathan-ll0yd/lifegames-design-system',
      },
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Introduction', slug: '' },
            { label: 'Installation', slug: 'getting-started' },
          ],
        },
        {
          label: 'Tokens',
          items: [
            { label: 'Colors', slug: 'tokens/colors' },
            { label: 'Spacing', slug: 'tokens/spacing' },
            { label: 'Typography', slug: 'tokens/typography' },
            { label: 'Motion', slug: 'tokens/motion' },
          ],
        },
        {
          label: 'Components',
          items: [
            { label: 'Card', slug: 'components/card' },
            { label: 'Pill', slug: 'components/pill' },
          ],
        },
        {
          label: 'Widgets',
          items: [
            { label: 'Gallery', slug: 'widgets' },
          ],
        },
      ],
    }),
  ],
});

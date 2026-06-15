// Post-adapter display fixtures for the ReadingFeed widget.
//
// DashboardReading is a DS-authored display projection. Its `articles[]` shape
// ({ title, source, date, category, starred }) is a SIMPLIFIED, renamed projection
// that does NOT match the runtime adapter output (adaptArticles produces a
// different AdaptedArticle[] shape used only by the runtime updater). The SSR shell
// reads this authored projection. Authored against `@lifegames/schemas`
// `DashboardReading` (authored/dashboard-reading.schema.json).
//
// `date` is a pre-formatted relative string ("Today", "2 days ago"), so it is
// already deterministic — no clock injection needed for this domain.
import type { DashboardReading } from '@lifegames/schemas';
import { authored } from './branded';

export const baseline = authored<DashboardReading>({
  articles: [
    {
      title: 'Why SQLite Is So Great for the Edge',
      source: 'fly.io/blog',
      date: 'Today',
      category: 'Tech',
      starred: true,
    },
    {
      title: 'The End of Localhost',
      source: 'dx.tips',
      date: 'Yesterday',
      category: 'Tech',
      starred: false,
    },
    {
      title: 'Building AI Agents That Actually Work',
      source: 'anthropic.com',
      date: '2 days ago',
      category: 'AI',
      starred: true,
    },
    {
      title: 'CSS Container Queries Are Here',
      source: 'web.dev',
      date: '3 days ago',
      category: 'Web',
      starred: false,
    },
    {
      title: 'Rust for JavaScript Developers',
      source: 'rustforjs.dev',
      date: '4 days ago',
      category: 'Languages',
      starred: false,
    },
    {
      title: 'The Architecture of a Modern Startup',
      source: 'danluu.com',
      date: '5 days ago',
      category: 'Tech',
      starred: true,
    },
    {
      title: 'Why We Chose Turso Over PlanetScale',
      source: 'chiselstrike.com',
      date: '6 days ago',
      category: 'Databases',
      starred: false,
    },
    {
      title: 'Understanding V8 Internals',
      source: 'mrale.ph',
      date: '1 week ago',
      category: 'Web',
      starred: false,
    },
  ],
  stats: {
    totalSubscriptions: 47,
    unreadCount: 128,
    articlesThisWeek: 23,
    articlesLastWeek: 19,
    starredCount: 34,
  },
});

// Empty reading list with zeroed stats — exercises the "no articles" path.
export const empty = authored<DashboardReading>({
  articles: [],
  stats: {
    totalSubscriptions: 0,
    unreadCount: 0,
    articlesThisWeek: 0,
    articlesLastWeek: 0,
    starredCount: 0,
  },
});

export const readingPostAdapter = { baseline, empty };

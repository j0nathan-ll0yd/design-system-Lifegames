// Post-adapter display fixtures for the ReadingFeed widget.
//
// DashboardReading is a DS-authored display projection. Its `articles[]` shape
// ({ title, source, date, category, starred }) is a SIMPLIFIED, renamed projection
// that does NOT match the runtime adapter output (adaptArticles produces a
// different AdaptedArticle[] shape used only by the runtime updater). The SSR shell
// reads this authored projection. Authored against `@j0nathan-ll0yd/schemas`
// `DashboardReading` (authored/dashboard-reading.schema.json).
//
// `date` is a pre-formatted relative string ("Today", "2 days ago"), so it is
// already deterministic — no clock injection needed for this domain.
import type {DashboardReading} from '@j0nathan-ll0yd/schemas'
import {authored} from './branded'

export const baseline = authored<DashboardReading>({
  articles: [
    {title: 'Why SQLite Is So Great for the Edge', source: 'fly.io/blog', date: 'Today', category: 'Tech', starred: true},
    {title: 'The End of Localhost', source: 'dx.tips', date: 'Yesterday', category: 'Tech', starred: false},
    {title: 'Building AI Agents That Actually Work', source: 'anthropic.com', date: '2 days ago', category: 'AI', starred: true},
    {title: 'CSS Container Queries Are Here', source: 'web.dev', date: '3 days ago', category: 'Web', starred: false},
    {title: 'Rust for JavaScript Developers', source: 'rustforjs.dev', date: '4 days ago', category: 'Languages', starred: false},
    {title: 'The Architecture of a Modern Startup', source: 'danluu.com', date: '5 days ago', category: 'Tech', starred: true},
    {title: 'Why We Chose Turso Over PlanetScale', source: 'chiselstrike.com', date: '6 days ago', category: 'Databases', starred: false},
    {title: 'Understanding V8 Internals', source: 'mrale.ph', date: '1 week ago', category: 'Web', starred: false}
  ],
  stats: {totalSubscriptions: 47, unreadCount: 128, articlesThisWeek: 23, articlesLastWeek: 19, starredCount: 34}
})

// Empty reading list with zeroed stats — exercises the "no articles" path.
export const empty = authored<DashboardReading>({
  articles: [],
  stats: {totalSubscriptions: 0, unreadCount: 0, articlesThisWeek: 0, articlesLastWeek: 0, starredCount: 0}
})

// Maximally populated: large article list covering all categories, max realistic
// stats, mix of starred/unstarred, longest realistic strings.
export const full = authored<DashboardReading>({
  articles: [
    {
      title: 'Building Production-Grade AI Agents with Tool Use, Memory Systems, and Multi-Step Reasoning',
      source: 'anthropic.com',
      date: 'Today',
      category: 'AI',
      starred: true
    },
    {
      title: 'The Complete Guide to Edge Computing Architecture and Deployment Patterns for Modern Applications',
      source: 'fly.io/blog',
      date: 'Today',
      category: 'Tech',
      starred: true
    },
    {
      title: 'How Modern Type Systems Prevent Entire Categories of Runtime Errors at Scale',
      source: 'jvns.ca',
      date: 'Yesterday',
      category: 'Languages',
      starred: true
    },
    {
      title: 'Why Every Engineering Organization Needs a Design System Before Scaling Past Ten Engineers',
      source: 'bradfrost.com',
      date: 'Yesterday',
      category: 'Design',
      starred: false
    },
    {
      title: 'Distributed SQLite at the Edge with LiteFS and Turso for Read-Heavy Workloads',
      source: 'chiselstrike.com',
      date: '2 days ago',
      category: 'Databases',
      starred: true
    },
    {
      title: 'CSS Container Queries, Cascade Layers, and the Future of Responsive Component Design',
      source: 'web.dev',
      date: '2 days ago',
      category: 'Web',
      starred: false
    },
    {
      title: 'The Science Behind Apple Health Metrics and What They Actually Tell You About Wellness',
      source: 'gizmodo.com',
      date: '3 days ago',
      category: 'Health',
      starred: true
    },
    {
      title: 'Rust for JavaScript Developers: A Comprehensive Guide to Systems Programming Concepts',
      source: 'rustforjs.dev',
      date: '3 days ago',
      category: 'Languages',
      starred: false
    },
    {
      title: 'The Architecture of a Modern Startup: From Monolith to Microservices and Back Again',
      source: 'danluu.com',
      date: '4 days ago',
      category: 'Tech',
      starred: true
    },
    {
      title: 'Understanding V8 Internals: How JavaScript Engines Optimize Hot Code Paths at Runtime',
      source: 'mrale.ph',
      date: '4 days ago',
      category: 'Web',
      starred: false
    },
    {
      title: 'Serverless at Scale: Lessons Learned Running Thousands of Lambda Functions in Production',
      source: 'theburningmonk.com',
      date: '5 days ago',
      category: 'Tech',
      starred: true
    },
    {
      title: 'SwiftUI Performance Optimization: Reducing View Body Re-evaluations in Complex Layouts',
      source: 'swiftwithmajid.com',
      date: '5 days ago',
      category: 'Mobile',
      starred: false
    },
    {
      title: 'DTCG Token Format Deep Dive: Building Cross-Platform Design Token Pipelines That Scale',
      source: 'designtokens.org',
      date: '6 days ago',
      category: 'Design',
      starred: true
    },
    {
      title: 'Aurora DSQL: A Deep Dive into Serverless Distributed SQL for Real-Time Applications',
      source: 'aws.amazon.com/blogs',
      date: '1 week ago',
      category: 'Databases',
      starred: false
    },
    {
      title: 'The End of Localhost: Why Cloud Development Environments Are the Future of Software Engineering',
      source: 'dx.tips',
      date: '1 week ago',
      category: 'Tech',
      starred: false
    }
  ],
  stats: {totalSubscriptions: 128, unreadCount: 456, articlesThisWeek: 67, articlesLastWeek: 52, starredCount: 189}
})

export const readingPostAdapter = {baseline, empty, full}

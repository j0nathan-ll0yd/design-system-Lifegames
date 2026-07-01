import type { ArticlesExport } from '@lifegames/portal-contract/schemas';
import { createArticlesFixture, createArticle } from '../factories/articles';
import { isoDate, isoTimestamp } from '../factories/helpers';

export const articlesVariations: Record<string, ArticlesExport> = {
  baseline: createArticlesFixture(),

  empty: createArticlesFixture({ articles: [] }),

  withNotes: createArticlesFixture({
    articles: [
      createArticle({
        articleUrl: 'https://news.ycombinator.com/item?id=notes1',
        articleTitle: 'How to Build Resilient Distributed Systems',
        sourceTitle: 'Hacker News',
        notes: [
          { comment: 'Great point about consensus algorithms', createdAt: isoTimestamp() },
          { comment: 'Follow up on the Raft paper', createdAt: isoTimestamp() },
        ],
      }),
      createArticle({
        articleUrl: 'https://techcrunch.com/notes2-placeholder',
        articleTitle: 'The Economics of Open Source Sustainability',
        sourceTitle: 'TechCrunch',
        notes: [{ comment: 'Relevant to mantle licensing decisions', createdAt: isoTimestamp() }],
      }),
      createArticle({
        articleUrl: 'https://arstechnica.com/notes3-placeholder',
        articleTitle: 'Aurora DSQL: A Deep Dive into Serverless Postgres',
        sourceTitle: 'Ars Technica',
        notes: [
          { comment: 'Compare with our current DSQL usage', createdAt: isoTimestamp() },
          { comment: 'Check the async index creation section', createdAt: isoTimestamp() },
        ],
      }),
    ],
  }),

  overThirty: createArticlesFixture({
    articles: Array.from({ length: 40 }, (_, i) =>
      createArticle({
        articleUrl: `https://example.com/article-${i + 1}`,
        articleTitle: `Article title number ${i + 1} in large dataset`,
        sourceTitle: ['Hacker News', 'TechCrunch', 'The Verge', 'Ars Technica', 'Gizmodo'][i % 5],
        articlePublishedAt: isoDate(),
        savedAt: isoTimestamp(),
      }),
    ),
    generatedAt: isoTimestamp(),
  }),

  pagination: createArticlesFixture({
    articles: Array.from({ length: 25 }, (_, i) =>
      createArticle({
        articleUrl: `https://example.com/page-article-${i + 1}`,
        articleTitle: `Paginated article ${i + 1} of twenty-five`,
        sourceTitle: ['Hacker News', 'TechCrunch', 'The Verge'][i % 3],
        articlePublishedAt: isoDate(),
        savedAt: isoTimestamp(),
      }),
    ),
    generatedAt: isoTimestamp(),
  }),

  // Exercises the empty-title resilience path: articles where articleTitle is an
  // empty string ("") and sourceTitle is unusually long. Named after the Hoodline
  // local-news aggregator, which frequently produces articles with empty/missing
  // titles and verbose publication names. Used by the `reading-empty-title`
  // visual test scenario to assert bug-6 fix (widget must not crash or mis-render).
  hoodlineEmptyTitle: createArticlesFixture({
    articles: [
      createArticle({
        articleUrl: 'https://hoodline.com/2026/03/sf-mission-district-development',
        articleTitle: '',
        sourceTitle: 'Hoodline — San Francisco Bay Area Neighborhood News and Community Updates',
        sourceUrl: 'https://hoodline.com',
        sourceDomain: 'hoodline.com',
        articlePublishedAt: isoDate(),
        savedAt: isoTimestamp(),
      }),
      createArticle({
        articleUrl: 'https://hoodline.com/2026/03/soma-construction-permit',
        articleTitle: '',
        sourceTitle: 'Hoodline — San Francisco Bay Area Neighborhood News and Community Updates',
        sourceUrl: 'https://hoodline.com',
        sourceDomain: 'hoodline.com',
        articlePublishedAt: isoDate(1),
        savedAt: isoTimestamp(1),
      }),
      createArticle({
        articleUrl: 'https://news.ycombinator.com/item?id=normalAfterEmpty',
        articleTitle: 'Normal article following empty-title entries (mixed rendering)',
        sourceTitle: 'Hacker News',
        sourceUrl: 'https://news.ycombinator.com',
        articlePublishedAt: isoDate(2),
        savedAt: isoTimestamp(2),
      }),
    ],
  }),

  // Maximally populated: many articles, ALL nullable item fields set to non-null
  // values (articleAuthor, articleFirstImageUrl, articlePublishedAt, articleBoards,
  // articleCategories, sourceTitle, sourceUrl, sourceFeedUrl, sourceDomain,
  // articleEngagement, articleEngagementRate, articleFirstHighlight,
  // articleFirstComment), plus notes populated.
  full: createArticlesFixture({
    articles: [
      createArticle({
        articleUrl: 'https://news.ycombinator.com/item?id=full1',
        articleTitle: 'Building Production-Grade AI Agents with Tool Use and Memory Systems',
        articleAuthor: 'Simon Willison',
        articleFirstImageUrl: 'https://news.ycombinator.com/images/full1-hero.jpg',
        articlePublishedAt: isoDate(),
        articleBoards: 'AI, Engineering',
        articleCategories: 'Artificial Intelligence, Software Engineering',
        sourceTitle: 'Hacker News',
        sourceUrl: 'https://news.ycombinator.com',
        sourceFeedUrl: 'https://news.ycombinator.com/rss',
        sourceDomain: 'news.ycombinator.com',
        articleEngagement: '1247 points',
        articleEngagementRate: '98.2%',
        articleFirstHighlight: 'The key insight is that agents need persistent memory to be useful',
        articleFirstComment: 'This aligns with my experience building Claude-based workflows',
        savedAt: isoTimestamp(),
        notes: [
          { comment: 'Relevant to our agent orchestration approach', createdAt: isoTimestamp() },
          { comment: 'Compare with OMC multi-agent patterns', createdAt: isoTimestamp() },
        ],
      }),
      createArticle({
        articleUrl: 'https://www.theverge.com/full2-serverless-edge',
        articleTitle: 'The Complete Guide to Edge Computing Architecture and Deployment Patterns',
        articleAuthor: 'Cassidy Williams',
        articleFirstImageUrl: 'https://www.theverge.com/images/full2-hero.jpg',
        articlePublishedAt: isoDate(),
        articleBoards: 'Infrastructure, Cloud',
        articleCategories: 'Cloud Computing, DevOps',
        sourceTitle: 'The Verge',
        sourceUrl: 'https://www.theverge.com',
        sourceFeedUrl: 'https://www.theverge.com/rss/index.xml',
        sourceDomain: 'theverge.com',
        articleEngagement: '842 shares',
        articleEngagementRate: '76.5%',
        articleFirstHighlight:
          'Edge functions reduce latency by 10x compared to regional deployments',
        articleFirstComment: 'We saw similar improvements after moving to CloudFront Functions',
        savedAt: isoTimestamp(),
        notes: [
          { comment: 'Applies to our CloudFront interception layer', createdAt: isoTimestamp() },
        ],
      }),
      createArticle({
        articleUrl: 'https://arstechnica.com/full3-type-systems',
        articleTitle:
          'How Modern Type Systems Prevent Entire Categories of Runtime Errors at Scale',
        articleAuthor: 'Julia Evans',
        articleFirstImageUrl: 'https://arstechnica.com/images/full3-hero.jpg',
        articlePublishedAt: isoDate(),
        articleBoards: 'Programming Languages, TypeScript',
        articleCategories: 'Type Systems, Compiler Design',
        sourceTitle: 'Ars Technica',
        sourceUrl: 'https://arstechnica.com',
        sourceFeedUrl: 'https://arstechnica.com/feed/',
        sourceDomain: 'arstechnica.com',
        articleEngagement: '634 points',
        articleEngagementRate: '89.1%',
        articleFirstHighlight: 'Branded types eliminate an entire class of string-confusion bugs',
        articleFirstComment: 'This is exactly the pattern we use with authored<T>()',
        savedAt: isoTimestamp(),
        notes: [
          { comment: 'Validates our branded type approach in schemas', createdAt: isoTimestamp() },
          { comment: 'Share with the team for the tech talk series', createdAt: isoTimestamp() },
          {
            comment: 'Cross-reference with the DTCG token naming decisions',
            createdAt: isoTimestamp(),
          },
        ],
      }),
      createArticle({
        articleUrl: 'https://techcrunch.com/full4-design-systems',
        articleTitle:
          'Why Every Engineering Organization Needs a Design System Before Scaling Past Ten Engineers',
        articleAuthor: 'Brad Frost',
        articleFirstImageUrl: 'https://techcrunch.com/images/full4-hero.jpg',
        articlePublishedAt: isoDate(),
        articleBoards: 'Design, Frontend',
        articleCategories: 'Design Systems, Frontend Architecture',
        sourceTitle: 'TechCrunch',
        sourceUrl: 'https://techcrunch.com',
        sourceFeedUrl: 'https://techcrunch.com/feed/',
        sourceDomain: 'techcrunch.com',
        articleEngagement: '523 shares',
        articleEngagementRate: '82.7%',
        articleFirstHighlight:
          'Token-driven design systems reduce inconsistency by 85% in the first year',
        articleFirstComment: 'The DTCG format is the key enabler here — single source of truth',
        savedAt: isoTimestamp(),
        notes: [
          { comment: 'Directly relevant to our DS governance model', createdAt: isoTimestamp() },
        ],
      }),
      createArticle({
        articleUrl: 'https://gizmodo.com/full5-health-wearables',
        articleTitle:
          'The Science Behind Apple Health Metrics and What They Actually Tell You About Wellness',
        articleAuthor: 'Dr. Sarah Chen',
        articleFirstImageUrl: 'https://gizmodo.com/images/full5-hero.jpg',
        articlePublishedAt: isoDate(),
        articleBoards: 'Health, Wearables',
        articleCategories: 'Health Technology, Quantified Self',
        sourceTitle: 'Gizmodo',
        sourceUrl: 'https://gizmodo.com',
        sourceFeedUrl: 'https://gizmodo.com/rss',
        sourceDomain: 'gizmodo.com',
        articleEngagement: '1089 views',
        articleEngagementRate: '91.3%',
        articleFirstHighlight:
          'HRV SDNN correlates strongly with recovery quality in trained individuals',
        articleFirstComment: 'This explains the clinical ranges we use in the health widget',
        savedAt: isoTimestamp(),
        notes: [
          { comment: 'Informs our health fixture quantity ranges', createdAt: isoTimestamp() },
          {
            comment: 'Cross-check with the DashboardHealth ranges config',
            createdAt: isoTimestamp(),
          },
        ],
      }),
      createArticle({
        articleUrl: 'https://fly.io/full6-distributed-sqlite',
        articleTitle:
          'Distributed SQLite at the Edge with LiteFS and Turso for Read-Heavy Workloads',
        articleAuthor: 'Ben Johnson',
        articleFirstImageUrl: 'https://fly.io/images/full6-hero.jpg',
        articlePublishedAt: isoDate(),
        articleBoards: 'Databases, Edge Computing',
        articleCategories: 'Databases, Distributed Systems',
        sourceTitle: 'Fly.io Blog',
        sourceUrl: 'https://fly.io',
        sourceFeedUrl: 'https://fly.io/blog/feed.xml',
        sourceDomain: 'fly.io',
        articleEngagement: '756 points',
        articleEngagementRate: '85.9%',
        articleFirstHighlight:
          'LiteFS replication adds less than 5ms of write latency across regions',
        articleFirstComment: 'Interesting comparison with Aurora DSQL for our use case',
        savedAt: isoTimestamp(),
        notes: [
          {
            comment: 'Compare latency characteristics with our DSQL setup',
            createdAt: isoTimestamp(),
          },
        ],
      }),
    ],
  }),
};

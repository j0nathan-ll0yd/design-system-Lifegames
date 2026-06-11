// AUTO-GENERATED — do not edit. Regenerate: pnpm -C packages/portal-contract codegen

export const API_BASE_URL = 'https://g5ardkzev3.execute-api.us-west-2.amazonaws.com/prod' as const;
export const CLOUDFRONT_BASE = 'https://d1pfm520aduift.cloudfront.net' as const;
export const WEBSOCKET_URL = 'wss://iu1k9jv4mi.execute-api.us-west-2.amazonaws.com/live' as const;

export const ENDPOINTS = {
  health: '/health.json',
  sleep: '/sleep.json',
  workouts: '/workouts.json',
  books: '/books.json',
  starredRepos: '/github-starred-repos.json',
  githubEvents: '/github-events.json',
  articles: '/articles.json',
  location: '/location.json',
  focus: '/focus.json',
  theatreReviews: '/theatre-reviews.json',
} as const;

export const LLM_CONTENT_PATHS = {
  llmsFull: '/llms-full.txt',
  llmsSmall: '/llms-small.txt',
  indexMarkdown: '/index.md',
} as const;

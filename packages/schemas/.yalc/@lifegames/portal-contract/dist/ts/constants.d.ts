export declare const API_BASE_URL: "https://g5ardkzev3.execute-api.us-west-2.amazonaws.com/prod";
export declare const CLOUDFRONT_BASE: "https://d1pfm520aduift.cloudfront.net";
export declare const WEBSOCKET_URL: "wss://iu1k9jv4mi.execute-api.us-west-2.amazonaws.com/live";
export declare const ENDPOINTS: {
    readonly health: "/health.json";
    readonly sleep: "/sleep.json";
    readonly workouts: "/workouts.json";
    readonly books: "/books.json";
    readonly starredRepos: "/github-starred-repos.json";
    readonly githubEvents: "/github-events.json";
    readonly articles: "/articles.json";
    readonly location: "/location.json";
    readonly focus: "/focus.json";
    readonly theatreReviews: "/theatre-reviews.json";
};
export declare const LLM_CONTENT_PATHS: {
    readonly llmsFull: "/llms-full.txt";
    readonly llmsSmall: "/llms-small.txt";
    readonly indexMarkdown: "/index.md";
};

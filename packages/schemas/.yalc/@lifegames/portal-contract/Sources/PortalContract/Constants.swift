// AUTO-GENERATED — do not edit. Regenerate: pnpm -C packages/portal-contract codegen

import Foundation

public enum PortalContract {
    public static let apiBaseURL = URL(string: "https://g5ardkzev3.execute-api.us-west-2.amazonaws.com/prod")!
    public static let cloudFrontBase = URL(string: "https://d1pfm520aduift.cloudfront.net")!
    public static let webSocketURL = URL(string: "wss://iu1k9jv4mi.execute-api.us-west-2.amazonaws.com/live")!

    public enum Endpoints {
        public static let health = "/health.json"
        public static let sleep = "/sleep.json"
        public static let workouts = "/workouts.json"
        public static let books = "/books.json"
        public static let starredRepos = "/github-starred-repos.json"
        public static let githubEvents = "/github-events.json"
        public static let articles = "/articles.json"
        public static let location = "/location.json"
        public static let focus = "/focus.json"
        public static let theatreReviews = "/theatre-reviews.json"
    }

    public enum ContentPaths {
        public static let llmsFull = "/llms-full.txt"
        public static let llmsSmall = "/llms-small.txt"
        public static let indexMarkdown = "/index.md"
    }
}

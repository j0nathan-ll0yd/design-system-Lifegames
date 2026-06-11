// AUTO-GENERATED — do not edit. Regenerate: pnpm -C packages/portal-contract codegen

// This file was generated from JSON Schema using quicktype, do not modify it directly.
// To parse the JSON, add this file to your project and do:
//
//   let articlesExport = try ArticlesExport(json)

import Foundation

// MARK: - ArticlesExport
public struct ArticlesExport {
    public let articles: [Article]
    public let generatedAt: String

    public init(articles: [Article], generatedAt: String) {
        self.articles = articles
        self.generatedAt = generatedAt
    }
}

// MARK: - Article
public struct Article {
    public let articleAuthor, articleBoards, articleCategories, articleEngagement: String?
    public let articleEngagementRate, articleFirstComment, articleFirstHighlight, articleFirstImageURL: String?
    public let articlePublishedAt: String?
    public let articleTitle, articleURL: String
    public let notes: [Note]
    public let savedAt: String
    public let sourceDomain, sourceFeedURL, sourceTitle, sourceURL: String?

    public init(articleAuthor: String?, articleBoards: String?, articleCategories: String?, articleEngagement: String?, articleEngagementRate: String?, articleFirstComment: String?, articleFirstHighlight: String?, articleFirstImageURL: String?, articlePublishedAt: String?, articleTitle: String, articleURL: String, notes: [Note], savedAt: String, sourceDomain: String?, sourceFeedURL: String?, sourceTitle: String?, sourceURL: String?) {
        self.articleAuthor = articleAuthor
        self.articleBoards = articleBoards
        self.articleCategories = articleCategories
        self.articleEngagement = articleEngagement
        self.articleEngagementRate = articleEngagementRate
        self.articleFirstComment = articleFirstComment
        self.articleFirstHighlight = articleFirstHighlight
        self.articleFirstImageURL = articleFirstImageURL
        self.articlePublishedAt = articlePublishedAt
        self.articleTitle = articleTitle
        self.articleURL = articleURL
        self.notes = notes
        self.savedAt = savedAt
        self.sourceDomain = sourceDomain
        self.sourceFeedURL = sourceFeedURL
        self.sourceTitle = sourceTitle
        self.sourceURL = sourceURL
    }
}

// MARK: - Note
public struct Note {
    public let comment, createdAt: String

    public init(comment: String, createdAt: String) {
        self.comment = comment
        self.createdAt = createdAt
    }
}

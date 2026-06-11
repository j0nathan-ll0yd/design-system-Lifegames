// AUTO-GENERATED — do not edit. Regenerate: pnpm -C packages/portal-contract codegen

// This file was generated from JSON Schema using quicktype, do not modify it directly.
// To parse the JSON, add this file to your project and do:
//
//   let githubStarredReposExport = try GithubStarredReposExport(json)

import Foundation

// MARK: - GithubStarredReposExport
public struct GithubStarredReposExport {
    public let generatedAt: String
    public let repos: [Repo]

    public init(generatedAt: String, repos: [Repo]) {
        self.generatedAt = generatedAt
        self.repos = repos
    }
}

// MARK: - Repo
public struct Repo {
    public let description: String?
    public let forksCount: Double
    public let htmlURL: String
    public let languages: [Language]
    public let licenseKey, licenseName, licenseSpdxID: String?
    public let name: String
    public let openIssuesCount: Double
    public let ownerHTMLURL, ownerLogin: String
    public let size, stargazersCount: Double
    public let starredAt: String
    public let topics: [String]
    public let watchersCount: Double

    public init(description: String?, forksCount: Double, htmlURL: String, languages: [Language], licenseKey: String?, licenseName: String?, licenseSpdxID: String?, name: String, openIssuesCount: Double, ownerHTMLURL: String, ownerLogin: String, size: Double, stargazersCount: Double, starredAt: String, topics: [String], watchersCount: Double) {
        self.description = description
        self.forksCount = forksCount
        self.htmlURL = htmlURL
        self.languages = languages
        self.licenseKey = licenseKey
        self.licenseName = licenseName
        self.licenseSpdxID = licenseSpdxID
        self.name = name
        self.openIssuesCount = openIssuesCount
        self.ownerHTMLURL = ownerHTMLURL
        self.ownerLogin = ownerLogin
        self.size = size
        self.stargazersCount = stargazersCount
        self.starredAt = starredAt
        self.topics = topics
        self.watchersCount = watchersCount
    }
}

// MARK: - Language
public struct Language {
    public let language: String
    public let lines: Double

    public init(language: String, lines: Double) {
        self.language = language
        self.lines = lines
    }
}

// AUTO-GENERATED — do not edit. Regenerate: pnpm -C packages/portal-contract codegen

// This file was generated from JSON Schema using quicktype, do not modify it directly.
// To parse the JSON, add this file to your project and do:
//
//   let githubEventsExport = try GithubEventsExport(json)

import Foundation

// MARK: - GithubEventsExport
public struct GithubEventsExport {
    public let events: [Event]
    public let generatedAt: String

    public init(events: [Event], generatedAt: String) {
        self.events = events
        self.generatedAt = generatedAt
    }
}

// MARK: - Event
public struct Event {
    public let additions: Double?
    public let date: String
    public let deletions: Double?
    public let hash: String?
    public let number: Double?
    public let repo, title, type: String

    public init(additions: Double?, date: String, deletions: Double?, hash: String?, number: Double?, repo: String, title: String, type: String) {
        self.additions = additions
        self.date = date
        self.deletions = deletions
        self.hash = hash
        self.number = number
        self.repo = repo
        self.title = title
        self.type = type
    }
}

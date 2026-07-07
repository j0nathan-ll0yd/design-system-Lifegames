// MediaFixtureModels.swift — Codable wire models for the `media/` fixture pool.
// Mirrors packages/schemas/authored/media-{file,library,profile}.schema.json.
// Consumed by app-side preview fixture modules (S98): decode via
// `WidgetFixtures.data(category: "media", name: ...)`, then map to app domain types.
// Field types are raw wire values (bytes, seconds, YYYYMMDD strings), never
// display-formatted strings — formatting belongs to the consuming app.
import Foundation

/// Download lifecycle status. Raw values match the OMD backend's FileStatus wire
/// values ("pending" is lowercase because push notifications send it lowercase).
public enum MediaFileStatus: String, Codable, Sendable {
    case pending
    case queued = "Queued"
    case downloading = "Downloading"
    case downloaded = "Downloaded"
    case failed = "Failed"
}

/// A single downloadable media file (media-file.*.json, and entries of media-library.*.json).
public struct MediaFileProps: Equatable, Codable, Sendable {
    public let fileId: String
    public let key: String
    /// YYYYMMDD (API) or ISO-8601 (push notifications).
    public let publishDate: String?
    /// File size in bytes.
    public let size: Int?
    public let url: String?
    public let title: String?
    public let description: String?
    public let authorName: String?
    public let authorUser: String?
    public let contentType: String?
    public let status: MediaFileStatus?
    /// Duration in seconds.
    public let duration: Int?
    /// YYYYMMDD.
    public let uploadDate: String?
    public let viewCount: Int?
    public let thumbnailUrl: String?

    public init(
        fileId: String,
        key: String,
        publishDate: String? = nil,
        size: Int? = nil,
        url: String? = nil,
        title: String? = nil,
        description: String? = nil,
        authorName: String? = nil,
        authorUser: String? = nil,
        contentType: String? = nil,
        status: MediaFileStatus? = nil,
        duration: Int? = nil,
        uploadDate: String? = nil,
        viewCount: Int? = nil,
        thumbnailUrl: String? = nil
    ) {
        self.fileId = fileId
        self.key = key
        self.publishDate = publishDate
        self.size = size
        self.url = url
        self.title = title
        self.description = description
        self.authorName = authorName
        self.authorUser = authorUser
        self.contentType = contentType
        self.status = status
        self.duration = duration
        self.uploadDate = uploadDate
        self.viewCount = viewCount
        self.thumbnailUrl = thumbnailUrl
    }
}

/// A backend list response of media files (media-library.*.json).
public struct MediaLibraryProps: Equatable, Codable, Sendable {
    public let files: [MediaFileProps]

    public init(files: [MediaFileProps]) {
        self.files = files
    }
}

/// Signed-in user identity (media-profile.*.json). Synthetic values only.
public struct MediaUserProps: Equatable, Codable, Sendable {
    public let email: String
    public let firstName: String
    public let lastName: String
    public let identifier: String

    public init(email: String, firstName: String, lastName: String, identifier: String) {
        self.email = email
        self.firstName = firstName
        self.lastName = lastName
        self.identifier = identifier
    }
}

/// Aggregate library metrics (media-profile.*.json).
public struct MediaMetricsProps: Equatable, Codable, Sendable {
    public let downloadCount: Int
    public let totalStorageBytes: Int
    public let playCount: Int

    public init(downloadCount: Int, totalStorageBytes: Int, playCount: Int) {
        self.downloadCount = downloadCount
        self.totalStorageBytes = totalStorageBytes
        self.playCount = playCount
    }
}

/// Account profile: user + metrics (media-profile.*.json).
public struct MediaProfileProps: Equatable, Codable, Sendable {
    public let user: MediaUserProps
    public let metrics: MediaMetricsProps

    public init(user: MediaUserProps, metrics: MediaMetricsProps) {
        self.user = user
        self.metrics = metrics
    }
}

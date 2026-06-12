import Foundation

enum OMDFixtures {
    enum DownloadState {
        case downloaded
        case downloading(progress: Double)
        case queued
        case none
    }

    struct MediaFile: Identifiable {
        let id: String
        let title: String
        let author: String
        let viewCount: Int
        let fileSize: String
        let duration: String
        let thumbnailSystemImage: String
        let downloadState: DownloadState
    }

    struct UserProfile {
        let name: String
        let email: String
        let initials: String
        let downloadCount: Int
        let storageUsed: String
        let playCount: Int
    }

    enum Quality: String, CaseIterable {
        case high = "High (1080p)"
        case medium = "Medium (720p)"
        case low = "Low (480p)"
    }

    struct DownloadConfig {
        let quality: Quality
        let cellularEnabled: Bool
    }

    struct PendingFile: Identifiable {
        let id: String
        let timestamp: Date
    }

    static let sampleFiles: [MediaFile] = [
        MediaFile(
            id: "file-001",
            title: "SwiftUI State Management Deep Dive",
            author: "Point-Free",
            viewCount: 142_300,
            fileSize: "1.2 GB",
            duration: "1:42:18",
            thumbnailSystemImage: "film.stack",
            downloadState: .downloaded
        ),
        MediaFile(
            id: "file-002",
            title: "The Composable Architecture in Practice",
            author: "Brandon Williams",
            viewCount: 89500,
            fileSize: "876 MB",
            duration: "58:44",
            thumbnailSystemImage: "play.rectangle.fill",
            downloadState: .downloading(progress: 0.62)
        ),
        MediaFile(
            id: "file-003",
            title: "Async/Await: Modern Concurrency Patterns",
            author: "WWDC Sessions",
            viewCount: 234_100,
            fileSize: "654 MB",
            duration: "45:12",
            thumbnailSystemImage: "arrow.trianglehead.2.clockwise.rotate.90",
            downloadState: .queued
        ),
        MediaFile(
            id: "file-004",
            title: "Building a Design System from Zero",
            author: "Design Engineering",
            viewCount: 61200,
            fileSize: "1.8 GB",
            duration: "2:14:05",
            thumbnailSystemImage: "square.stack.3d.up.fill",
            downloadState: .none
        ),
        MediaFile(
            id: "file-005",
            title: "Instruments Profiling Workshop",
            author: "Apple Developer",
            viewCount: 44800,
            fileSize: "392 MB",
            duration: "32:09",
            thumbnailSystemImage: "waveform.path.ecg",
            downloadState: .downloaded
        ),
        MediaFile(
            id: "file-006",
            title: "SwiftData: The Complete Guide",
            author: "Hacking with Swift",
            viewCount: 178_600,
            fileSize: "715 MB",
            duration: "1:08:33",
            thumbnailSystemImage: "cylinder.split.1x2.fill",
            downloadState: .none
        ),
        MediaFile(
            id: "file-007",
            title: "Accessibility First: Building Inclusive Apps",
            author: "Rob Whitaker",
            viewCount: 28900,
            fileSize: "445 MB",
            duration: "37:51",
            thumbnailSystemImage: "accessibility.fill",
            downloadState: .queued
        ),
    ]

    static let sampleSingleFile: MediaFile = sampleFiles[0]

    static let sampleUser = UserProfile(
        name: "Jonathan Lloyd",
        email: "webmaster@lifegames.org",
        initials: "JL",
        downloadCount: 47,
        storageUsed: "12.4 GB",
        playCount: 183
    )

    static let sampleConfig = DownloadConfig(
        quality: .high,
        cellularEnabled: false
    )

    static let samplePendingFiles: [PendingFile] = [
        PendingFile(id: "pnd-a1b2c3d4", timestamp: Date(timeIntervalSinceNow: -120)),
        PendingFile(id: "pnd-e5f6a7b8", timestamp: Date(timeIntervalSinceNow: -340)),
        PendingFile(id: "pnd-c9d0e1f2", timestamp: Date(timeIntervalSinceNow: -890)),
        PendingFile(id: "pnd-a3b4c5d6", timestamp: Date(timeIntervalSinceNow: -1620)),
    ]
}

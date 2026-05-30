import Foundation

public struct DiagnosticsMonitorProps: Equatable, Codable, Sendable {
    public enum Category: String, Codable, Sendable, CaseIterable {
        case syn, bg, hlt, loc, lif, con
    }

    public struct CategoryCount: Equatable, Codable, Sendable {
        public let category: Category
        public let count: Int

        public init(category: Category, count: Int) {
            self.category = category
            self.count = count
        }
    }

    public struct LogEntry: Equatable, Codable, Sendable, Identifiable {
        public let id: String
        public let category: Category
        public let timestamp: Date
        public let message: String

        public init(id: String, category: Category, timestamp: Date, message: String) {
            self.id = id
            self.category = category
            self.timestamp = timestamp
            self.message = message
        }
    }

    public enum TransferStatus: String, Codable, Sendable {
        case idle
        case uploading
        case success
        case failure
    }

    public let totalEventCount: Int
    public let counts: [CategoryCount]
    public let fileSizeBytes: Int
    public let entries: [LogEntry]
    public let transferStatus: TransferStatus
    public let referenceDate: Date

    public init(
        totalEventCount: Int,
        counts: [CategoryCount],
        fileSizeBytes: Int,
        entries: [LogEntry],
        transferStatus: TransferStatus = .idle,
        referenceDate: Date = Date()
    ) {
        self.totalEventCount = totalEventCount
        self.counts = counts
        self.fileSizeBytes = fileSizeBytes
        self.entries = entries
        self.transferStatus = transferStatus
        self.referenceDate = referenceDate
    }
}

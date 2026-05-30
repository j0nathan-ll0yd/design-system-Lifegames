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

public extension DiagnosticsMonitorProps {
    private static let baseReference = Date(timeIntervalSinceReferenceDate: 760_000_000)

    static let previewEmpty = DiagnosticsMonitorProps(
        totalEventCount: 0,
        counts: [
            .init(category: .syn, count: 0),
            .init(category: .bg, count: 0),
            .init(category: .hlt, count: 0),
            .init(category: .loc, count: 0),
            .init(category: .lif, count: 0),
            .init(category: .con, count: 0),
        ],
        fileSizeBytes: 0,
        entries: [],
        transferStatus: .idle,
        referenceDate: baseReference
    )

    static let previewPopulated = DiagnosticsMonitorProps(
        totalEventCount: 142,
        counts: [
            .init(category: .syn, count: 48),
            .init(category: .bg, count: 22),
            .init(category: .hlt, count: 31),
            .init(category: .loc, count: 18),
            .init(category: .lif, count: 14),
            .init(category: .con, count: 9),
        ],
        fileSizeBytes: 24576,
        entries: [
            .init(id: "p1", category: .syn, timestamp: baseReference.addingTimeInterval(-12), message: "Sync cycle completed"),
            .init(id: "p2", category: .hlt, timestamp: baseReference.addingTimeInterval(-30), message: "Heart sample batch posted"),
            .init(id: "p3", category: .bg, timestamp: baseReference.addingTimeInterval(-109), message: "Background refresh scheduled"),
            .init(id: "p4", category: .loc, timestamp: baseReference.addingTimeInterval(-238), message: "Region monitoring resumed"),
            .init(id: "p5", category: .lif, timestamp: baseReference.addingTimeInterval(-305), message: "App entered foreground"),
            .init(id: "p6", category: .con, timestamp: baseReference.addingTimeInterval(-420), message: "Reachability changed"),
        ],
        transferStatus: .idle,
        referenceDate: baseReference
    )

    static let previewMany: DiagnosticsMonitorProps = {
        let categories: [Category] = [.syn, .bg, .hlt, .loc, .lif, .con]
        let entries: [LogEntry] = (0 ..< 32).map { i in
            let cat = categories[i % categories.count]
            return LogEntry(
                id: "m\(i)",
                category: cat,
                timestamp: baseReference.addingTimeInterval(TimeInterval(-i * 15)),
                message: "Event \(i + 1)"
            )
        }
        return DiagnosticsMonitorProps(
            totalEventCount: 320,
            counts: [
                .init(category: .syn, count: 96),
                .init(category: .bg, count: 54),
                .init(category: .hlt, count: 71),
                .init(category: .loc, count: 47),
                .init(category: .lif, count: 32),
                .init(category: .con, count: 20),
            ],
            fileSizeBytes: 96512,
            entries: entries,
            transferStatus: .idle,
            referenceDate: baseReference
        )
    }()

    static let previewTransferring = DiagnosticsMonitorProps(
        totalEventCount: 142,
        counts: previewPopulated.counts,
        fileSizeBytes: 24576,
        entries: previewPopulated.entries,
        transferStatus: .uploading,
        referenceDate: baseReference
    )
}

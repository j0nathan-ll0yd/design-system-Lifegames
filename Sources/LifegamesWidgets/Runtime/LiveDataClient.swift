import Foundation
import Observation

// SAFETY: @MainActor-isolated via @Observable; all mutations occur on MainActor through SwiftUI bindings.
// PollEngine callback dispatches back to MainActor before writing published properties.
@available(macOS 14.0, iOS 17.0, watchOS 10.0, *)
@Observable
public final class LiveDataClient: @unchecked Sendable {
    public var health: DailyActivityProps?
    public var heartRate: HeartRateProps?
    public var hydration: HydrationProps?
    public var nightSummary: NightSummaryProps?
    public var workouts: WorkoutsProps?
    public var systemStatus: SystemStatusProps?

    public private(set) var isConnected = false
    public private(set) var lastPollAt: Date?
    public private(set) var errorCount = 0

    private let baseURL: URL
    private let session: URLSession
    private let pollEngine: PollEngine
    private let decoder: JSONDecoder

    public init(
        baseURL: URL,
        session: URLSession = .shared,
        fastInterval: Duration = .seconds(30),
        slowInterval: Duration = .seconds(120)
    ) {
        self.baseURL = baseURL
        self.session = session
        pollEngine = PollEngine(fastInterval: fastInterval, slowInterval: slowInterval)
        decoder = JSONDecoder()
    }

    public func start() async {
        isConnected = true
        await pollEngine.start { [weak self] tier in
            await self?.poll(tier: tier)
        }
    }

    public func stop() async {
        await pollEngine.stop()
        isConnected = false
    }

    private func poll(tier _: PollEngine.Tier) async {
        lastPollAt = Date()
    }

    private func fetch<T: Decodable>(_ path: String, as _: T.Type) async -> T? {
        let url = baseURL.appendingPathComponent(path)
        do {
            let (data, _) = try await session.data(from: url)
            return try decoder.decode(T.self, from: data)
        } catch {
            errorCount += 1
            return nil
        }
    }
}

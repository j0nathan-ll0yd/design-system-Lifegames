import Foundation

public actor PollEngine {
    public enum Tier: Sendable {
        case fast
        case slow
    }

    private let fastInterval: Duration
    private let slowInterval: Duration
    private var fastTask: Task<Void, Never>?
    private var slowTask: Task<Void, Never>?
    private var onPoll: (@Sendable (Tier) async -> Void)?

    public init(
        fastInterval: Duration = .seconds(30),
        slowInterval: Duration = .seconds(120)
    ) {
        self.fastInterval = fastInterval
        self.slowInterval = slowInterval
    }

    public func start(onPoll: @escaping @Sendable (Tier) async -> Void) {
        self.onPoll = onPoll
        fastTask = Task { [fastInterval] in
            while !Task.isCancelled {
                await onPoll(.fast)
                try? await Task.sleep(for: fastInterval)
            }
        }
        slowTask = Task { [slowInterval] in
            while !Task.isCancelled {
                await onPoll(.slow)
                try? await Task.sleep(for: slowInterval)
            }
        }
    }

    public func stop() {
        fastTask?.cancel()
        slowTask?.cancel()
        fastTask = nil
        slowTask = nil
        onPoll = nil
    }
}

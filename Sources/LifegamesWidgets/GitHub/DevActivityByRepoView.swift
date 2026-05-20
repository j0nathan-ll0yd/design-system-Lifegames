import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct DevActivityByRepoView: View {
    public let props: DevActivityProps

    public init(props: DevActivityProps) {
        self.props = props
    }

    private var groupedByRepo: [(repo: String, events: [DevActivityEvent])] {
        var dict: [String: [DevActivityEvent]] = [:]
        for event in props.events {
            dict[event.repo, default: []].append(event)
        }
        return dict.sorted { $0.key < $1.key }.map { (repo: $0.key, events: $0.value) }
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "ACTIVITY BY REPO", dotColor: .colorAccentGreen, timestamp: "recent")

            VStack(alignment: .leading, spacing: 10) {
                ForEach(Array(groupedByRepo.enumerated()), id: \.offset) { _, group in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(group.repo)
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundStyle(.colorAccentBlue)
                        ForEach(Array(group.events.enumerated()), id: \.offset) { _, event in
                            HStack(spacing: 6) {
                                DevActivityIcon(type: event.type)
                                Text(event.title)
                                    .font(.system(size: 10))
                                    .foregroundStyle(.colorTextMuted)
                                    .lineLimit(1)
                                Spacer()
                                Text(event.date)
                                    .font(.system(size: 9))
                                    .foregroundStyle(.colorTextMuted.opacity(0.6))
                            }
                        }
                    }
                }
            }
            .padding(.horizontal, 18)
            .padding(.bottom, 12)
        }
        .neonCard(accent: .colorAccentGreen)
    }
}

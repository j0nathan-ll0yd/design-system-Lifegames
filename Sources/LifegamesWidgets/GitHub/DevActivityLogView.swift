import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct DevActivityLogView: View {
    public let props: DevActivityProps

    public init(props: DevActivityProps) {
        self.props = props
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "ACTIVITY LOG", dotColor: .colorAccentGreen, timestamp: "terminal")

            VStack(alignment: .leading, spacing: 2) {
                ForEach(Array(props.events.enumerated()), id: \.offset) { _, event in
                    HStack(spacing: 6) {
                        DevActivityIcon(type: event.type)
                        Text(event.type)
                            .font(.system(size: 9, weight: .medium, design: .monospaced))
                            .foregroundStyle(.colorAccentGreen.opacity(0.7))
                            .frame(width: 60, alignment: .leading)
                        Text(event.title)
                            .font(.system(size: 9, design: .monospaced))
                            .foregroundStyle(.colorTextMuted)
                            .lineLimit(1)
                        Spacer()
                        Text(event.date)
                            .font(.system(size: 8, design: .monospaced))
                            .foregroundStyle(.colorTextMuted.opacity(0.5))
                    }
                    .padding(.vertical, 2)
                }
            }
            .padding(.horizontal, 18)
            .padding(.bottom, 12)
        }
        .neonCard(accent: .colorAccentGreen)
    }
}

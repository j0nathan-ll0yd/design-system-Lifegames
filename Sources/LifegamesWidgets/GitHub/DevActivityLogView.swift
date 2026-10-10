import LifegamesComponents
import LifegamesCopy
import LifegamesTokens
import SwiftUI

private let devLogCopy = CopyLoader.widgets.devLog

private struct DevActivityLogPopulatedView: View {
    let props: DevActivityProps

    init(props: DevActivityProps) {
        self.props = props
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: devLogCopy.title.uppercased(), dotColor: Color.colorAccentGreen, timestamp: devLogCopy.timestampLive)

            VStack(alignment: .leading, spacing: 2) {
                ForEach(Array(props.events.enumerated()), id: \.offset) { _, event in
                    HStack(spacing: 6) {
                        DevActivityIcon(type: event.type)
                        Text(event.type)
                            .font(.system(size: 9, weight: .medium, design: .monospaced))
                            .foregroundStyle(Color.colorAccentGreen.opacity(0.7))
                            .frame(width: 60, alignment: .leading)
                        Text(event.title)
                            .font(.system(size: 9, design: .monospaced))
                            .foregroundStyle(Color.colorTextMuted)
                            .lineLimit(1)
                        Spacer()
                        Text(event.date)
                            .font(.system(size: 8, design: .monospaced))
                            .foregroundStyle(Color.colorTextMuted.opacity(0.5))
                    }
                    .padding(.vertical, 2)
                }
            }
            .padding(.horizontal, 18)
            .padding(.bottom, 12)
        }
        .neonCard(accent: Color.colorAccentGreen)
    }
}

public struct DevActivityLogView: View {
    private let state: WidgetState<DevActivityProps>

    public init(state: WidgetState<DevActivityProps>) {
        self.state = state
    }

    public init(props: DevActivityProps) {
        state = props.events.isEmpty ? .empty : .populated(props)
    }

    public var body: some View {
        switch state {
        case .loading:
            DevActivityLogMessageView(message: nil)
        case .empty:
            DevActivityLogMessageView(message: devLogCopy.empty)
        case let .populated(props):
            DevActivityLogPopulatedView(props: props)
        case .unavailable:
            WidgetStateNoticeCard(notice: .unavailable, title: devLogCopy.title, accent: Color.colorAccentGreen)
        case .suppressed:
            WidgetStateNoticeCard(notice: .suppressed, title: devLogCopy.title, accent: Color.colorAccentGreen)
        }
    }
}

/// Loading (message nil) and empty chrome. Mirrors the other widgets' skeleton and empty cards.
private struct DevActivityLogMessageView: View {
    let message: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: devLogCopy.title.uppercased(), dotColor: Color.colorAccentGreen, timestamp: devLogCopy.timestampLive)

            if let message {
                Text(message)
                    .font(.system(size: 13))
                    .foregroundStyle(Color.colorTextMuted)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 24)
            } else {
                VStack(alignment: .leading, spacing: 8) {
                    ForEach(0 ..< 4, id: \.self) { _ in
                        SkeletonBar(width: 240, height: 10)
                    }
                }
                .padding(.horizontal, 18)
                .padding(.vertical, 12)
            }
        }
        .neonCard(accent: Color.colorAccentGreen)
    }
}

#Preview("Dev Activity Log — Unavailable") {
    DevActivityLogView(state: .unavailable)
        .padding()
        .background(Color.colorSurfaceBase)
        .preferredColorScheme(.dark)
}

#Preview("Dev Activity Log — Suppressed") {
    DevActivityLogView(state: .suppressed)
        .padding()
        .background(Color.colorSurfaceBase)
        .preferredColorScheme(.dark)
}

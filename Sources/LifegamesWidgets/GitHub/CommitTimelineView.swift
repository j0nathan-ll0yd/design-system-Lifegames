import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct CommitTimelineView: View {
    public let props: CommitTimelineProps

    public init(props: CommitTimelineProps) {
        self.props = props
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "COMMIT TIMELINE", dotColor: .colorAccentGreen, timestamp: "recent")

            VStack(spacing: 0) {
                ForEach(Array(props.commits.enumerated()), id: \.offset) { index, commit in
                    HStack(alignment: .top, spacing: 12) {
                        VStack(spacing: 0) {
                            Circle()
                                .fill(Color(hex: commit.repoColor))
                                .frame(width: 8, height: 8)
                                .neonGlow(Color(hex: commit.repoColor), radius: 4)
                            if index < props.commits.count - 1 {
                                Rectangle()
                                    .fill(Color.white.opacity(0.08))
                                    .frame(width: 1)
                                    .frame(maxHeight: .infinity)
                            }
                        }

                        VStack(alignment: .leading, spacing: 3) {
                            HStack {
                                Text(commit.repo)
                                    .font(.system(size: 10, weight: .semibold))
                                    .foregroundStyle(Color(hex: commit.repoColor))
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(Color(hex: commit.repoColor).opacity(0.12))
                                    .clipShape(RoundedRectangle(cornerRadius: 4))
                                Spacer()
                                Text(commit.date)
                                    .font(.system(size: 9))
                                    .foregroundStyle(.colorTextMuted)
                            }
                            Text(commit.message)
                                .font(.system(size: 10))
                                .foregroundStyle(.colorTextMuted)
                                .lineLimit(1)
                        }
                        .padding(.bottom, 12)
                    }
                }
            }
            .padding(.horizontal, 18)
        }
        .neonCard(accent: .colorAccentGreen)
    }
}

import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct CommitLogView: View {
    public let props: CommitLogProps

    public init(props: CommitLogProps) {
        self.props = props
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "COMMIT LOG", dotColor: .colorAccentGreen, timestamp: "terminal")

            VStack(alignment: .leading, spacing: 4) {
                ForEach(Array(props.commits.enumerated()), id: \.offset) { _, commit in
                    HStack(spacing: 8) {
                        Text(commit.hash)
                            .font(.system(size: 10, design: .monospaced))
                            .foregroundStyle(.colorAccentGreen.opacity(0.7))
                            .frame(width: 55, alignment: .leading)

                        Text(commit.message)
                            .font(.system(size: 10))
                            .foregroundStyle(.colorTextTitle)
                            .lineLimit(1)

                        Spacer()

                        HStack(spacing: 4) {
                            Text("+\(commit.additions)")
                                .font(.system(size: 9, design: .monospaced))
                                .foregroundStyle(.colorAccentGreen)
                            Text("-\(commit.deletions)")
                                .font(.system(size: 9, design: .monospaced))
                                .foregroundStyle(.colorHealthRed)
                        }
                    }
                    .padding(.vertical, 3)
                }
            }
            .padding(.horizontal, 18)
            .padding(.bottom, 12)
        }
        .neonCard(accent: .colorAccentGreen)
    }
}

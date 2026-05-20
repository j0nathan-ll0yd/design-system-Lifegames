import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct LanguageGridView: View {
    public let props: LanguageGridProps

    public init(props: LanguageGridProps) {
        self.props = props
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "LANGUAGE GRID", dotColor: .colorAccentGreen, timestamp: "repos")

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                ForEach(Array(props.languages.enumerated()), id: \.offset) { _, lang in
                    HStack(spacing: 8) {
                        Circle()
                            .fill(Color(hex: lang.color))
                            .frame(width: 8, height: 8)
                        VStack(alignment: .leading, spacing: 1) {
                            Text(lang.name)
                                .font(.system(size: 10, weight: .medium))
                                .foregroundStyle(.colorTextTitle)
                            HStack(spacing: 4) {
                                Text(String(format: "%.1f%%", lang.pct))
                                    .font(.system(size: 9))
                                    .foregroundStyle(.colorTextMuted)
                                Text("\(lang.repos) repos")
                                    .font(.system(size: 9))
                                    .foregroundStyle(.colorTextMuted.opacity(0.6))
                            }
                        }
                        Spacer()
                    }
                    .padding(8)
                    .background(Color.white.opacity(0.03))
                    .clipShape(RoundedRectangle(cornerRadius: 6))
                }
            }
            .padding(.horizontal, 18)
            .padding(.bottom, 12)
        }
        .neonCard(accent: .colorAccentGreen)
    }
}

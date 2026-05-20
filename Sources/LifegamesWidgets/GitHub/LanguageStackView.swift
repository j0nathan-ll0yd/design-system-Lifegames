import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct LanguageStackView: View {
    public let props: LanguageBarsProps

    public init(props: LanguageBarsProps) {
        self.props = props
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "LANGUAGE STACK", dotColor: .colorAccentGreen, timestamp: "repos")

            GeometryReader { geo in
                HStack(spacing: 1) {
                    ForEach(Array(props.languages.enumerated()), id: \.offset) { _, lang in
                        RoundedRectangle(cornerRadius: 2)
                            .fill(Color(hex: lang.color))
                            .frame(width: geo.size.width * lang.pct / 100)
                    }
                }
            }
            .frame(height: 10)
            .clipShape(RoundedRectangle(cornerRadius: 5))
            .padding(.horizontal, 18)

            HStack(spacing: 12) {
                ForEach(Array(props.languages.prefix(4).enumerated()), id: \.offset) { _, lang in
                    HStack(spacing: 4) {
                        Circle()
                            .fill(Color(hex: lang.color))
                            .frame(width: 6, height: 6)
                        Text(lang.name)
                            .font(.system(size: 9))
                            .foregroundStyle(.colorTextMuted)
                    }
                }
            }
            .padding(.horizontal, 18)
            .padding(.top, 8)
            .padding(.bottom, 12)
        }
        .neonCard(accent: .colorAccentGreen)
    }
}

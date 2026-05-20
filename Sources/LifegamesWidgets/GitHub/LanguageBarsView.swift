import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct LanguageBarsView: View {
    public let props: LanguageBarsProps

    public init(props: LanguageBarsProps) {
        self.props = props
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "LANGUAGES", dotColor: .colorAccentGreen, timestamp: "repos")

            VStack(spacing: 6) {
                ForEach(Array(props.languages.enumerated()), id: \.offset) { _, lang in
                    HStack(spacing: 8) {
                        Circle()
                            .fill(Color(hex: lang.color))
                            .frame(width: 6, height: 6)

                        Text(lang.name)
                            .font(.system(size: 10))
                            .foregroundStyle(.colorTextTitle)
                            .frame(width: 70, alignment: .leading)

                        GeometryReader { geo in
                            RoundedRectangle(cornerRadius: 3)
                                .fill(Color(hex: lang.color))
                                .frame(width: geo.size.width * lang.pct / 100)
                                .frame(maxHeight: .infinity)
                        }
                        .frame(height: 6)

                        Text(String(format: "%.1f%%", lang.pct))
                            .font(.system(size: 9, design: .monospaced))
                            .foregroundStyle(.colorTextMuted)
                            .frame(width: 40, alignment: .trailing)
                    }
                }
            }
            .padding(.horizontal, 18)
            .padding(.bottom, 12)
        }
        .neonCard(accent: .colorAccentGreen)
    }
}

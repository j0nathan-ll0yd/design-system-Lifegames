import LifegamesTokens
import SwiftUI

struct TypographyShowcase: View {
    private struct TypeStyle: Identifiable {
        let id = UUID()
        let name: String
        let sample: String
        let font: Font
        let tracking: CGFloat
        let textCase: Text.Case?
    }

    private let styles: [TypeStyle] = [
        TypeStyle(
            name: "Widget Header",
            sample: "HEALTH METRICS",
            font: .system(size: 10, weight: .bold, design: .monospaced),
            tracking: 3,
            textCase: .uppercase
        ),
        TypeStyle(
            name: "Section Label",
            sample: "Daily Summary",
            font: .system(size: 12, weight: .medium),
            tracking: 0.5,
            textCase: .uppercase
        ),
        TypeStyle(
            name: "Body",
            sample: "Your health data synced successfully.",
            font: .system(size: 13, weight: .regular),
            tracking: 0,
            textCase: nil
        ),
        TypeStyle(
            name: "Stat Value",
            sample: "8,247",
            font: .system(size: 28, weight: .bold, design: .rounded),
            tracking: 0,
            textCase: nil
        ),
        TypeStyle(
            name: "Stat Value Compact",
            sample: "432",
            font: .system(size: 20, weight: .bold, design: .rounded),
            tracking: 0,
            textCase: nil
        ),
        TypeStyle(
            name: "Metric Value",
            sample: "72 bpm",
            font: .system(.title2, design: .rounded, weight: .bold),
            tracking: 0,
            textCase: nil
        ),
        TypeStyle(
            name: "Timestamp",
            sample: "2026-04-23T14:30:00Z",
            font: .system(size: 10, design: .monospaced),
            tracking: 0,
            textCase: nil
        ),
        TypeStyle(
            name: "Data Label",
            sample: "Steps",
            font: .system(size: 13, weight: .semibold, design: .monospaced),
            tracking: 0,
            textCase: nil
        ),
        TypeStyle(
            name: "Hero Header",
            sample: "LIFE PORTAL",
            font: .system(size: 9, weight: .bold, design: .monospaced),
            tracking: 2,
            textCase: .uppercase
        ),
    ]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                ForEach(styles) { style in
                    VStack(alignment: .leading, spacing: 6) {
                        Text(style.name)
                            .font(.system(size: 10, weight: .medium, design: .monospaced))
                            .foregroundStyle(LGColor.textSubtle)

                        typeSample(style: style)
                            .foregroundStyle(LGColor.textPrimary)
                    }
                    .padding(.vertical, 14)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .overlay(alignment: .bottom) {
                        Rectangle()
                            .fill(LGColor.cardGlassBorder)
                            .frame(height: 0.5)
                    }
                }
            }
            .padding()
        }
        .gradientBackground()
        .navigationTitle("Typography")
        #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
        #endif
            .preferredColorScheme(.dark)
    }

    @ViewBuilder
    private func typeSample(style: TypeStyle) -> some View {
        if style.textCase == .uppercase {
            Text(style.sample)
                .font(style.font)
                .kerning(style.tracking)
                .textCase(.uppercase)
        } else {
            Text(style.sample)
                .font(style.font)
                .kerning(style.tracking)
        }
    }
}

#Preview("Typography") {
    NavigationStack {
        TypographyShowcase()
    }
    .preferredColorScheme(.dark)
}

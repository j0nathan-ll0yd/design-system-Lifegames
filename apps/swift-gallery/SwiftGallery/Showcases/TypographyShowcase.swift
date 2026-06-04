import LifegamesTokens
import SwiftUI

struct TypographyShowcase: View {
    private struct TypeStyle: Identifiable {
        let id = UUID()
        let name: String
        let token: String
        let sample: String
        let font: Font
        let tracking: CGFloat
        let textCase: Text.Case?
    }

    /// Hero scale: shows "Human Datastream" rendered at each scale step.
    private let scales: [TypeStyle] = [
        TypeStyle(name: "Hero", token: "32 / bold", sample: "Human Datastream",
                  font: .system(size: 32, weight: .bold), tracking: 0, textCase: nil),
        TypeStyle(name: "Title", token: "26 / bold", sample: "Human Datastream",
                  font: .system(size: 26, weight: .bold), tracking: 0, textCase: nil),
        TypeStyle(name: "XL", token: "22 / semibold", sample: "Human Datastream",
                  font: .system(size: 22, weight: .semibold), tracking: 0, textCase: nil),
        TypeStyle(name: "LG", token: "17 / semibold", sample: "Human Datastream",
                  font: .system(size: 17, weight: .semibold), tracking: 0, textCase: nil),
        TypeStyle(name: "MD", token: "13 / regular", sample: "The quick brown fox jumps over the lazy dog",
                  font: .system(size: 13, weight: .regular), tracking: 0, textCase: nil),
        TypeStyle(name: "Base", token: "11 / regular", sample: "The quick brown fox jumps over the lazy dog",
                  font: .system(size: 11, weight: .regular), tracking: 0, textCase: nil),
        TypeStyle(name: "SM", token: "9 / regular", sample: "The quick brown fox jumps over the lazy dog",
                  font: .system(size: 9, weight: .regular), tracking: 0, textCase: nil),
    ]

    /// Mono scale: the monospaced widget headers / labels that define the brand.
    private let mono: [TypeStyle] = [
        TypeStyle(name: "Widget Header", token: "10 / bold mono / k 3",
                  sample: "HEALTH METRICS",
                  font: .system(size: 10, weight: .bold, design: .monospaced),
                  tracking: 3, textCase: .uppercase),
        TypeStyle(name: "Hero Header", token: "9 / bold mono / k 2",
                  sample: "LIFE PORTAL",
                  font: .system(size: 9, weight: .bold, design: .monospaced),
                  tracking: 2, textCase: .uppercase),
        TypeStyle(name: "Section Label", token: "12 / medium / k 0.5",
                  sample: "Daily Summary",
                  font: .system(size: 12, weight: .medium),
                  tracking: 0.5, textCase: .uppercase),
        TypeStyle(name: "Data Label", token: "13 / semibold mono",
                  sample: "Steps",
                  font: .system(size: 13, weight: .semibold, design: .monospaced),
                  tracking: 0, textCase: nil),
        TypeStyle(name: "Timestamp", token: "10 / mono",
                  sample: "2026-04-23T14:30:00Z",
                  font: .system(size: 10, design: .monospaced),
                  tracking: 0, textCase: nil),
    ]

    /// Numeric scale: the punch-line numbers in metric cards.
    private let numeric: [TypeStyle] = [
        TypeStyle(name: "Stat Value", token: "28 / bold rounded",
                  sample: "8,247",
                  font: .system(size: 28, weight: .bold, design: .rounded),
                  tracking: 0, textCase: nil),
        TypeStyle(name: "Stat Value Compact", token: "20 / bold rounded",
                  sample: "432",
                  font: .system(size: 20, weight: .bold, design: .rounded),
                  tracking: 0, textCase: nil),
        TypeStyle(name: "Metric Value", token: "title2 / bold rounded",
                  sample: "72 bpm",
                  font: .system(.title2, design: .rounded, weight: .bold),
                  tracking: 0, textCase: nil),
    ]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 32) {
                header
                section(title: "Scale", styles: scales)
                section(title: "Monospaced", styles: mono)
                section(title: "Numeric", styles: numeric)
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 24)
        }
        .gradientBackground()
        .navigationTitle("Typography")
        #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
        #endif
            .preferredColorScheme(.dark)
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("/// TYPESYSTEM")
                .font(.system(size: 9, weight: .bold, design: .monospaced))
                .kerning(2.5)
                .foregroundStyle(LGColor.accentBlue)
            Text("Typography")
                .font(.system(size: 32, weight: .bold))
                .foregroundStyle(LGColor.textTitle)
            Text("System SF with rounded numerics for metrics and monospaced for widget chrome — every voice in the gallery.")
                .font(.system(size: 13))
                .foregroundStyle(LGColor.textMuted)
                .fixedSize(horizontal: false, vertical: true)
            Rectangle()
                .fill(LinearGradient(
                    colors: [LGColor.accentBlue, LGColor.accentPurple.opacity(0.0)],
                    startPoint: .leading,
                    endPoint: .trailing
                ))
                .frame(height: 1)
                .padding(.top, 4)
        }
    }

    private func section(title: String, styles: [TypeStyle]) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 8) {
                Text(title.uppercased())
                    .font(.system(size: 10, weight: .bold, design: .monospaced))
                    .kerning(2.5)
                    .foregroundStyle(LGColor.textSubtle)
                Rectangle()
                    .fill(LGColor.cardGlassBorder)
                    .frame(height: 0.5)
            }
            VStack(alignment: .leading, spacing: 0) {
                ForEach(styles) { style in
                    typeRow(style: style)
                }
            }
            .background(LGColor.surfaceRaised.opacity(0.4))
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(LGColor.cardGlassBorder, lineWidth: 0.5)
            )
        }
    }

    private func typeRow(style: TypeStyle) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                Text(style.name.uppercased())
                    .font(.system(size: 9, weight: .bold, design: .monospaced))
                    .kerning(1.5)
                    .foregroundStyle(LGColor.accentPink)
                Text("—  \(style.token)")
                    .font(.system(size: 9, design: .monospaced))
                    .foregroundStyle(LGColor.textSubtle)
            }
            sample(for: style)
                .foregroundStyle(LGColor.textTitle)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(LGColor.cardGlassBorder)
                .frame(height: 0.5)
                .opacity(style.id == lastRowId() ? 0 : 1)
        }
    }

    @ViewBuilder
    private func sample(for style: TypeStyle) -> some View {
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

    private func lastRowId() -> TypeStyle.ID? {
        scales.last?.id ?? mono.last?.id ?? numeric.last?.id
    }
}

#Preview("Typography") {
    NavigationStack {
        TypographyShowcase()
    }
    .preferredColorScheme(.dark)
}

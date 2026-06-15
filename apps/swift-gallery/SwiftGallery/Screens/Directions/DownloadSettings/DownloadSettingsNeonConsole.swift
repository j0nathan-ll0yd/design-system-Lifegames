import LifegamesComponents
import LifegamesComponentsCore
import LifegamesTemplates
import LifegamesTokens
import SwiftUI

struct DownloadSettingsNeonConsole: View {
    private let config = OMDFixtures.sampleConfig
    private let style = DirectionStyle.neonConsole
    @State private var cellularEnabled = OMDFixtures.sampleConfig.cellularEnabled

    var body: some View {
        // Partially built on SettingsTemplate. The closed row taxonomy
        // (toggle / navigation / value / destructive) cannot express the custom
        // radio-style quality picker (selection rings, glow, checkmarks), and
        // there is no `custom(AnyView)` escape hatch by design — so the quality
        // picker is a HOST-rendered sibling section above the template. The
        // cellular toggle DOES fit, so it lives in the template; the info copy
        // is the template section's footer.
        ScrollView {
            VStack(spacing: Spacing.s500) {
                qualitySection
                cellularSettings
            }
            .padding(Spacing.s400)
        }
        .background(LGColor.surfaceBase.ignoresSafeArea())
        #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
        #endif
            .navigationTitle("Download Settings")
    }

    /// The cellular toggle expressed through SettingsTemplate's closed taxonomy.
    /// Rendered inside its own fixed-height container so the host ScrollView can
    /// stack it below the bespoke quality picker. The info copy is the section
    /// footer.
    private var cellularSettings: some View {
        SettingsTemplate(
            sections: [
                SettingsTemplate.Section(
                    title: "Network",
                    footer: "Higher quality requires more storage space and longer download times. Files already downloaded will not be affected by quality changes.",
                    rows: [
                        .toggle(
                            label: "Cellular Downloads",
                            systemImage: "antenna.radiowaves.left.and.right",
                            isOn: $cellularEnabled
                        ),
                    ]
                ),
            ],
            accent: LGColor.accentCyan
        )
        .frame(height: 180)
        .scrollDisabled(true)
    }

    private var qualitySection: some View {
        VStack(alignment: .leading, spacing: Spacing.s300) {
            Text("Quality")
                .font(OMDFont.semibold(11))
                .foregroundStyle(LGColor.accentBlue)
                .textCase(.uppercase)
                .tracking(1.5)

            VStack(spacing: Spacing.s300) {
                ForEach(OMDFixtures.Quality.allCases, id: \.self) { quality in
                    neonQualityCard(quality, isSelected: quality == config.quality)
                }
            }
        }
    }

    private func neonQualityCard(_ quality: OMDFixtures.Quality, isSelected: Bool) -> some View {
        let accent: Color = isSelected ? LGColor.accentBlue : LGColor.borderSubtle
        return HStack(spacing: Spacing.s400) {
            ZStack {
                Circle()
                    .stroke(accent, lineWidth: isSelected ? 2 : 1)
                    .frame(width: 20, height: 20)
                if isSelected {
                    Circle()
                        .fill(LGColor.accentBlue)
                        .frame(width: 10, height: 10)
                        .shadow(color: LGColor.accentBlue.opacity(0.8), radius: 4)
                }
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(quality.rawValue)
                    .font(isSelected ? OMDFont.semibold(15) : OMDFont.regular(15))
                    .foregroundStyle(isSelected ? LGColor.textTitle : LGColor.textMuted)

                Text(qualitySubtitle(quality))
                    .font(OMDFont.regular(11))
                    .foregroundStyle(LGColor.textSubtle)
            }

            Spacer()

            if isSelected {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 18))
                    .foregroundStyle(LGColor.accentBlue)
                    .shadow(color: LGColor.accentBlue.opacity(0.6), radius: 6)
            }
        }
        .padding(Spacing.s450)
        .background(isSelected ? LGColor.accentBlue.opacity(0.08) : LGColor.surfaceRaised.opacity(0.6))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(
                    isSelected ? LGColor.accentBlue.opacity(0.6) : LGColor.borderSubtle,
                    lineWidth: isSelected ? 1.5 : 1
                )
        )
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(
            color: isSelected ? LGColor.accentBlue.opacity(0.2) : .clear,
            radius: isSelected ? 10 : 0
        )
    }

    private func qualitySubtitle(_ quality: OMDFixtures.Quality) -> String {
        switch quality {
        case .high: return "~1.5 GB/hr · Best visual fidelity"
        case .medium: return "~750 MB/hr · Balanced"
        case .low: return "~300 MB/hr · Saves storage"
        }
    }
}

#Preview("Download Settings — Neon Console") {
    NavigationStack {
        DownloadSettingsNeonConsole()
    }
    .background(LGColor.surfaceBase)
    .preferredColorScheme(.dark)
}

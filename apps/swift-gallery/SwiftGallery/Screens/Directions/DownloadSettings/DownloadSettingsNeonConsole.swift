import LifegamesComponents
import LifegamesComponentsCore
import LifegamesTokens
import SwiftUI

struct DownloadSettingsNeonConsole: View {
    private let config = OMDFixtures.sampleConfig
    private let style = DirectionStyle.neonConsole

    var body: some View {
        ScrollView {
            VStack(spacing: Spacing.s500) {
                qualitySection
                cellularSection
                infoBox
            }
            .padding(Spacing.s400)
        }
        .background(LGColor.surfaceBase.ignoresSafeArea())
        #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
        #endif
            .navigationTitle("Download Settings")
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

    private var cellularSection: some View {
        VStack(alignment: .leading, spacing: Spacing.s300) {
            Text("Network")
                .font(OMDFont.semibold(11))
                .foregroundStyle(LGColor.accentCyan)
                .textCase(.uppercase)
                .tracking(1.5)

            HStack(spacing: Spacing.s400) {
                Image(systemName: "antenna.radiowaves.left.and.right")
                    .font(.system(size: 20))
                    .foregroundStyle(LGColor.accentCyan)
                    .shadow(color: LGColor.accentCyan.opacity(0.5), radius: 6)

                VStack(alignment: .leading, spacing: 2) {
                    Text("Cellular Downloads")
                        .font(OMDFont.semibold(15))
                        .foregroundStyle(LGColor.textTitle)

                    Text("May use significant data")
                        .font(OMDFont.regular(11))
                        .foregroundStyle(LGColor.textSubtle)
                }

                Spacer()

                glowingToggle(isOn: config.cellularEnabled, accent: LGColor.accentCyan)
            }
            .padding(Spacing.s450)
            .neonCard(accent: LGColor.accentCyan)
        }
    }

    private func glowingToggle(isOn: Bool, accent: Color) -> some View {
        RoundedRectangle(cornerRadius: 14)
            .fill(isOn ? accent : LGColor.surfaceRaised)
            .frame(width: 44, height: 26)
            .overlay(
                Circle()
                    .fill(LGColor.textTitle)
                    .frame(width: 20, height: 20)
                    .shadow(color: isOn ? accent.opacity(0.6) : .clear, radius: 4)
                    .offset(x: isOn ? 9 : -9)
            )
            .shadow(color: isOn ? accent.opacity(0.4) : .clear, radius: 8)
    }

    private var infoBox: some View {
        HStack(alignment: .top, spacing: Spacing.s300) {
            Image(systemName: "info.circle.fill")
                .font(.system(size: 16))
                .foregroundStyle(LGColor.accentBlue.opacity(0.7))

            Text("Higher quality requires more storage space and longer download times. Files already downloaded will not be affected by quality changes.")
                .font(OMDFont.regular(12))
                .foregroundStyle(LGColor.textMuted)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(Spacing.s400)
        .background(LGColor.accentBlue.opacity(0.05))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(LGColor.accentBlue.opacity(0.2), lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 12))
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

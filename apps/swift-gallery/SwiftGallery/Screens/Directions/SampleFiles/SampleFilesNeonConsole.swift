import LifegamesComponents
import LifegamesComponentsCore
import LifegamesTokens
import SwiftUI

// MARK: - Registration

enum SampleFilesScreen {
    static let entry = ScreenEntry(
        id: "sample-files",
        title: "Sample Files",
        directions: [
            ScreenDirection(id: "neon-console", label: "Neon Console") {
                AnyView(SampleFilesNeonConsole())
            },
        ]
    )
}

// MARK: - View

struct SampleFilesNeonConsole: View {
    private let file = OMDFixtures.sampleSingleFile

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Spacing.s500) {
                // Header
                VStack(alignment: .leading, spacing: Spacing.s200) {
                    Text("GUEST PREVIEW")
                        .font(OMDFont.semibold(11))
                        .foregroundStyle(LGColor.accentBlue)
                        .tracking(2)

                    Text("Try a Sample File")
                        .font(OMDFont.bold(24))
                        .foregroundStyle(LGColor.textTitle)
                }
                .padding(.horizontal, Spacing.s400)
                .padding(.top, Spacing.s400)

                // Sample file hero — mirrors File Detail's hero treatment
                heroSection
                    .padding(.horizontal, Spacing.s400)

                // Benefits — all items inside a single container
                VStack(alignment: .leading, spacing: Spacing.s300) {
                    Text("UNLOCK FULL ACCESS")
                        .font(OMDFont.semibold(10))
                        .foregroundStyle(LGColor.textMuted)
                        .tracking(2)
                        .padding(.horizontal, Spacing.s400)

                    VStack(spacing: 0) {
                        benefitRow(
                            icon: "arrow.down.circle.fill",
                            title: "Unlimited Downloads",
                            detail: "Save any video for offline playback",
                            accent: LGColor.accentBlue
                        )
                        benefitDivider
                        benefitRow(
                            icon: "bolt.fill",
                            title: "Background Downloads",
                            detail: "Queue files while you browse",
                            accent: LGColor.accentCyan
                        )
                        benefitDivider
                        benefitRow(
                            icon: "lock.open.fill",
                            title: "No Restrictions",
                            detail: "Full library access, no limits",
                            accent: LGColor.accentPink
                        )
                        benefitDivider
                        benefitRow(
                            icon: "icloud.fill",
                            title: "Sync Across Devices",
                            detail: "Your library everywhere you go",
                            accent: LGColor.accentBlue
                        )
                    }
                    .neonCard(accent: LGColor.accentBlue)
                    .padding(.horizontal, Spacing.s400)
                }

                // CTA
                VStack(spacing: Spacing.s300) {
                    Button {} label: {
                        Text("Sign Up Free")
                            .font(OMDFont.bold(16))
                            .foregroundStyle(LGColor.surfaceBase)
                            .frame(maxWidth: .infinity)
                            .frame(height: 52)
                            .background(LGColor.accentBlue)
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                            .shadow(color: LGColor.accentBlue.opacity(0.5), radius: 12, y: 4)
                    }
                    .frame(minWidth: 44, minHeight: 44)
                    .contentShape(.rect)

                    Button {} label: {
                        Text("Sign In")
                            .font(OMDFont.medium(14))
                            .foregroundStyle(LGColor.accentBlue)
                    }
                    .frame(minWidth: 44, minHeight: 44)
                    .contentShape(.rect)
                }
                .padding(.horizontal, Spacing.s400)
                .padding(.bottom, Spacing.s600)
            }
        }
        .background(LGColor.surfaceBase.ignoresSafeArea())
        #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
        #endif
    }

    // MARK: - Hero (mirrors FileDetailNeonConsole hero treatment)

    private var heroSection: some View {
        VStack(alignment: .leading, spacing: Spacing.s400) {
            // Large 16:9 thumbnail with duration badge in a glassCard
            ZStack(alignment: .bottomTrailing) {
                RoundedRectangle(cornerRadius: 20)
                    .fill(LGColor.surfaceRaised)
                    .overlay(
                        Image(systemName: file.thumbnailSystemImage)
                            .font(.system(size: 64))
                            .foregroundStyle(LGColor.accentBlue.opacity(0.7))
                            .shadow(color: LGColor.accentBlue.opacity(0.5), radius: 16)
                    )
                    .aspectRatio(16.0 / 9.0, contentMode: .fit)
                    .frame(maxWidth: .infinity)

                DurationBadgeView(duration: file.duration, style: .neonConsole)
                    .padding(Spacing.s300)
            }
            .glassCard(tint: LGColor.accentBlue)

            // Title + author
            VStack(alignment: .leading, spacing: Spacing.s100) {
                Text(file.title)
                    .font(OMDFont.bold(20))
                    .foregroundStyle(LGColor.textTitle)

                Text(file.author)
                    .font(OMDFont.regular(14))
                    .foregroundStyle(LGColor.accentCyan)
                    .shadow(color: LGColor.accentCyan.opacity(0.4), radius: 4)
            }

            // Stats row
            HStack(spacing: Spacing.s300) {
                heroStat(
                    value: formattedViews(file.viewCount),
                    label: "VIEWS",
                    icon: "eye.fill",
                    accent: LGColor.accentBlue
                )
                heroStat(
                    value: file.duration,
                    label: "DURATION",
                    icon: "timer",
                    accent: LGColor.accentCyan
                )
                heroStat(
                    value: file.fileSize,
                    label: "SIZE",
                    icon: "internaldrive.fill",
                    accent: LGColor.accentPink
                )
            }
        }
    }

    private func heroStat(value: String, label: String, icon: String, accent: Color) -> some View {
        VStack(alignment: .leading, spacing: Spacing.s100) {
            Image(systemName: icon)
                .font(.system(size: 13))
                .foregroundStyle(accent)
                .shadow(color: accent.opacity(0.5), radius: 4)

            Text(value)
                .font(OMDFont.mono(15))
                .foregroundStyle(LGColor.textTitle)
                .lineLimit(1)
                .minimumScaleFactor(0.7)

            Text(label)
                .font(OMDFont.medium(9))
                .foregroundStyle(LGColor.textSubtle)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .neonCard(accent: accent)
    }

    // MARK: - Benefits (single container, stacked rows)

    private var benefitDivider: some View {
        Rectangle()
            .fill(LGColor.borderSubtle)
            .frame(height: 0.5)
            .padding(.leading, Spacing.s400)
    }

    private func benefitRow(icon: String, title: String, detail: String, accent: Color) -> some View {
        HStack(spacing: Spacing.s300) {
            Image(systemName: icon)
                .font(.system(size: 20))
                .foregroundStyle(accent)
                .frame(width: 32)
                .shadow(color: accent.opacity(0.6), radius: 6)

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(OMDFont.semibold(14))
                    .foregroundStyle(LGColor.textTitle)
                Text(detail)
                    .font(OMDFont.regular(12))
                    .foregroundStyle(LGColor.textMuted)
            }

            Spacer()
        }
        .padding(Spacing.s400)
    }
}

private func formattedViews(_ count: Int) -> String {
    if count >= 1_000_000 {
        return String(format: "%.1fM", Double(count) / 1_000_000)
    } else if count >= 1000 {
        return String(format: "%.1fK", Double(count) / 1000)
    }
    return "\(count)"
}

#Preview {
    SampleFilesNeonConsole()
        .background(LGColor.surfaceBase)
        .preferredColorScheme(.dark)
}

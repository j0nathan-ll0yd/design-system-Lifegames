import LifegamesComponents
import LifegamesComponentsCore
import LifegamesTokens
import SwiftUI

struct FileDetailNeonConsole: View {
    private let file = OMDFixtures.sampleFiles[0]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Spacing.s400) {
                // Hero thumbnail in glassCard
                ZStack(alignment: .bottomTrailing) {
                    RoundedRectangle(cornerRadius: 20)
                        .fill(LGColor.surfaceRaised)
                        .overlay(
                            Image(systemName: file.thumbnailSystemImage)
                                .font(.system(size: 64))
                                .foregroundStyle(LGColor.accentBlue.opacity(0.7))
                                .shadow(color: LGColor.accentBlue.opacity(0.5), radius: 16)
                        )
                        .frame(maxWidth: .infinity)
                        .frame(height: 220)

                    DurationBadgeView(duration: file.duration, style: .neonConsole)
                        .padding(Spacing.s300)
                }
                .glassCard(tint: LGColor.accentBlue)

                // Title + author
                VStack(alignment: .leading, spacing: Spacing.s100) {
                    Text(file.title)
                        .font(.system(size: 20, weight: .bold))
                        .foregroundStyle(LGColor.textTitle)

                    Text(file.author)
                        .font(.system(size: 14, design: .monospaced))
                        .foregroundStyle(LGColor.accentCyan)
                        .shadow(color: LGColor.accentCyan.opacity(0.4), radius: 4)
                }

                // Neon metric blocks
                HStack(spacing: Spacing.s300) {
                    neonMetric(
                        value: formattedViews(file.viewCount),
                        label: "VIEWS",
                        icon: "eye.fill",
                        accent: LGColor.accentBlue
                    )
                    neonMetric(
                        value: file.duration,
                        label: "DURATION",
                        icon: "timer",
                        accent: LGColor.accentCyan
                    )
                    neonMetric(
                        value: file.fileSize,
                        label: "SIZE",
                        icon: "internaldrive.fill",
                        accent: LGColor.accentPink
                    )
                }

                // Description (expandable)
                VStack(alignment: .leading, spacing: Spacing.s200) {
                    Text("About this video")
                        .font(.system(size: 12, weight: .bold, design: .monospaced))
                        .foregroundStyle(LGColor.accentBlue)
                        .textCase(.uppercase)
                        .shadow(color: LGColor.accentBlue.opacity(0.4), radius: 3)

                    Text(sampleDescription)
                        .font(.system(size: 14))
                        .foregroundStyle(LGColor.textPrimary)
                        .lineLimit(nil)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .neonCard(accent: LGColor.accentBlue)

                // File details row
                HStack(spacing: Spacing.s300) {
                    Label("2024-03-15", systemImage: "calendar")
                        .font(.system(size: 11, design: .monospaced))
                        .foregroundStyle(LGColor.textSubtle)

                    Spacer()

                    Label(file.fileSize, systemImage: "doc.fill")
                        .font(.system(size: 11, design: .monospaced))
                        .foregroundStyle(LGColor.textSubtle)
                }

                // Primary action
                Button {} label: {
                    Label("Download", systemImage: "arrow.down.circle.fill")
                        .font(.system(size: 16, weight: .semibold, design: .monospaced))
                        .foregroundStyle(LGColor.surfaceBase)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, Spacing.s400)
                        .background(LGColor.accentBlue)
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                        .shadow(color: LGColor.accentBlue.opacity(0.6), radius: 12, x: 0, y: 4)
                }
                .frame(minWidth: 44, minHeight: 44)
                .contentShape(.rect)

                // Secondary actions — single horizontal row
                HStack(spacing: Spacing.s200) {
                    secondaryButton(label: "Play", icon: "play.fill", accent: LGColor.accentCyan)
                    secondaryButton(label: "Cancel", icon: "xmark.circle", accent: LGColor.accentAmber)
                    secondaryButton(label: "Delete", icon: "trash", accent: LGColor.accentPink)
                    secondaryButton(label: "Share", icon: "square.and.arrow.up", accent: LGColor.accentBlue)
                }
            }
            .padding(Spacing.s400)
        }
        .background(LGColor.surfaceBase)
        .gradientBackground()
        #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
        #endif
    }

    private func neonMetric(value: String, label: String, icon: String, accent: Color) -> some View {
        VStack(alignment: .leading, spacing: Spacing.s100) {
            Image(systemName: icon)
                .font(.system(size: 13))
                .foregroundStyle(accent)
                .shadow(color: accent.opacity(0.5), radius: 4)

            Text(value)
                .font(.system(size: 15, weight: .bold, design: .monospaced))
                .foregroundStyle(LGColor.textTitle)
                .lineLimit(1)
                .minimumScaleFactor(0.7)

            Text(label)
                .font(.system(size: 9, weight: .medium, design: .monospaced))
                .foregroundStyle(LGColor.textSubtle)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .neonCard(accent: accent)
    }

    private func secondaryButton(label: String, icon: String, accent: Color) -> some View {
        Button {} label: {
            VStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.system(size: 16))
                    .foregroundStyle(accent)
                    .shadow(color: accent.opacity(0.5), radius: 4)

                Text(label)
                    .font(.system(size: 10, design: .monospaced))
                    .foregroundStyle(LGColor.textMuted)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, Spacing.s300)
            .padding(.horizontal, Spacing.s100)
            .background(LGColor.surfaceRaised)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(accent.opacity(0.3), lineWidth: 1)
            )
        }
        .frame(minWidth: 44, minHeight: 44)
        .contentShape(.rect)
    }
}

private let sampleDescription =
    "A deep dive into SwiftUI's state management system, exploring how data flows through your app. We cover @State, @Binding, @ObservableObject, and the newer @Observable macro in iOS 17+. Learn when to use each approach and how to structure your app architecture for testability and maintainability."

private func formattedViews(_ count: Int) -> String {
    if count >= 1_000_000 {
        return String(format: "%.1fM", Double(count) / 1_000_000)
    } else if count >= 1000 {
        return String(format: "%.1fK", Double(count) / 1000)
    }
    return "\(count)"
}

#Preview("File Detail — Neon Console") {
    NavigationStack {
        FileDetailNeonConsole()
    }
    .background(LGColor.surfaceBase)
    .preferredColorScheme(.dark)
}

enum FileDetailScreen {
    static let entry = ScreenEntry(
        id: "file-detail",
        title: "File Detail",
        directions: [
            ScreenDirection(id: "neon-console", label: "Neon Console") { AnyView(FileDetailNeonConsole()) },
        ]
    )
}

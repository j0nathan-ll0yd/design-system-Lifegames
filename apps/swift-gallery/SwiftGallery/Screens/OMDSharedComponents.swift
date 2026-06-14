import LifegamesComponents
import LifegamesComponentsCore
import LifegamesTokens
import SwiftUI

// MARK: - DirectionStyle

struct DirectionStyle {
    let accent: Color
    let cornerRadius: CGFloat
    let cardPadding: CGFloat
    let usesCard: Bool
    let monospacedNumerics: Bool
    let thumbnailSize: CGSize

    static let neonConsole = DirectionStyle(
        accent: LGColor.accentBlue,
        cornerRadius: 20,
        cardPadding: Spacing.s450,
        usesCard: true,
        monospacedNumerics: true,
        thumbnailSize: CGSize(width: 120, height: 68)
    )
}

// MARK: - MediaThumbnailView

struct MediaThumbnailView: View {
    let file: OMDFixtures.MediaFile
    let style: DirectionStyle

    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            RoundedRectangle(cornerRadius: style.cornerRadius == 0 ? 0 : 8)
                .fill(LGColor.surfaceRaised)
                .overlay(
                    Image(systemName: file.thumbnailSystemImage)
                        .font(.system(size: style.thumbnailSize.width == .infinity ? 48 : 24))
                        .foregroundStyle(style.accent.opacity(0.7))
                )
                .frame(
                    width: style.thumbnailSize.width == .infinity ? nil : style.thumbnailSize.width,
                    height: style.thumbnailSize.height
                )

            DurationBadgeView(duration: file.duration, style: style)
                .padding(4)
        }
    }
}

// MARK: - DurationBadgeView

struct DurationBadgeView: View {
    let duration: String
    let style: DirectionStyle

    var body: some View {
        Text(duration)
            .font(
                style.monospacedNumerics
                    ? .system(size: 10, weight: .medium, design: .monospaced)
                    : .system(size: 10, weight: .medium)
            )
            .foregroundStyle(LGColor.textTitle)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(Color.black.opacity(0.72))
            .clipShape(Capsule())
    }
}

// MARK: - FileRowNeon

// A media row: thumbnail-left, title, author, and an icon-based meta line
// (size / views; duration lives on the thumbnail badge). Colors are kept
// consistent across every row — a single accent for the author and the card
// edge — so the list reads calmly rather than as a rainbow.

struct FileRowNeon: View {
    let file: OMDFixtures.MediaFile

    var body: some View {
        HStack(alignment: .top, spacing: Spacing.s300) {
            MediaThumbnailView(file: file, style: .neonConsole)

            VStack(alignment: .leading, spacing: Spacing.s150) {
                Text(file.title)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(LGColor.textTitle)
                    .lineLimit(2)
                    .truncationMode(.tail)

                HStack(spacing: Spacing.s100) {
                    Image(systemName: "person.circle.fill")
                        .font(.system(size: 11))
                        .foregroundStyle(LGColor.accentCyan)
                    Text(file.author)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(LGColor.accentCyan)
                        .lineLimit(1)
                }

                // Duration lives on the thumbnail badge; the meta line carries
                // size + views so neither truncates in the row's text column.
                HStack(spacing: Spacing.s300) {
                    metaItem(icon: "arrow.down.doc.fill", text: file.fileSize)
                    metaItem(icon: "eye.fill", text: formattedViews(file.viewCount))
                }
            }

            Spacer(minLength: Spacing.s200)

            DownloadProgressView(state: file.downloadState, style: .neonConsole)
        }
        .neonCard(accent: LGColor.accentBlue)
    }

    private func metaItem(icon: String, text: String) -> some View {
        HStack(spacing: 3) {
            Image(systemName: icon)
                .font(.system(size: 9))
            Text(text)
                .font(.system(size: 11, design: .monospaced))
                .lineLimit(1)
        }
        .foregroundStyle(LGColor.textSubtle)
    }
}

// MARK: - OMDBrand

/// Shared brand treatment for the OFFLINE / "media downloader" surfaces
/// (Launch, Login): a cyan→blue→pink wordmark gradient plus colorful neon
/// radial washes for the background.
enum OMDBrand {
    static let wordmarkGradient = LinearGradient(
        colors: [LGColor.accentCyan, LGColor.accentBlue, LGColor.accentPink],
        startPoint: .leading,
        endPoint: .trailing
    )

    static var colorWashes: some View {
        ZStack {
            RadialGradient(
                colors: [LGColor.accentCyan.opacity(0.18), .clear],
                center: UnitPoint(x: 0.2, y: 0.22), startRadius: 0, endRadius: 300
            )
            RadialGradient(
                colors: [LGColor.accentPink.opacity(0.15), .clear],
                center: UnitPoint(x: 0.85, y: 0.8), startRadius: 0, endRadius: 320
            )
            RadialGradient(
                colors: [LGColor.accentPurple.opacity(0.12), .clear],
                center: UnitPoint(x: 0.5, y: 0.5), startRadius: 0, endRadius: 380
            )
        }
    }
}

// MARK: - DownloadProgressView

struct DownloadProgressView: View {
    let state: OMDFixtures.DownloadState
    let style: DirectionStyle

    var body: some View {
        switch state {
        case .downloaded:
            Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(style.accent)
                .font(.system(size: iconSize))

        case let .downloading(progress):
            ZStack {
                Circle()
                    .stroke(style.accent.opacity(0.2), lineWidth: lineWidth)
                Circle()
                    .trim(from: 0, to: progress)
                    .stroke(style.accent, style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                    .shadow(color: style.monospacedNumerics ? style.accent.opacity(0.5) : .clear, radius: 4)
            }
            .frame(width: ringSize, height: ringSize)

        case .queued:
            Image(systemName: "clock.fill")
                .foregroundStyle(LGColor.textSubtle)
                .font(.system(size: iconSize))

        case .none:
            Image(systemName: "arrow.down.circle")
                .foregroundStyle(LGColor.textSubtle)
                .font(.system(size: iconSize))
        }
    }

    private var ringSize: CGFloat {
        style.thumbnailSize.width == .infinity ? 24 : (style.thumbnailSize.width < 80 ? 16 : 24)
    }

    private var lineWidth: CGFloat {
        style.thumbnailSize.width < 80 ? 2 : 3
    }

    private var iconSize: CGFloat {
        style.thumbnailSize.width == .infinity ? 20 : (style.thumbnailSize.width < 80 ? 14 : 18)
    }
}

// MARK: - StatCardView

// Gallery-local fork of MetricCardView that omits the baked-in .portalCard() so each
// direction can apply its own card styling.

struct StatCardView: View {
    let label: String
    let value: String
    let systemImage: String
    let style: DirectionStyle

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.s100) {
            HStack {
                Image(systemName: systemImage)
                    .font(.system(size: 14))
                    .foregroundStyle(style.accent)
                Spacer()
            }

            Text(value)
                .font(
                    style.monospacedNumerics
                        ? .system(size: 16, weight: .bold, design: .monospaced)
                        : .system(size: 16, weight: .bold)
                )
                .foregroundStyle(LGColor.textTitle)
                .lineLimit(1)
                .minimumScaleFactor(0.7)

            Text(label)
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(LGColor.textMuted)
                .textCase(.uppercase)
                .lineLimit(1)
        }
    }
}

// MARK: - SettingRowView

struct SettingRowView: View {
    let systemImage: String
    let label: String
    let accessory: SettingAccessory

    enum SettingAccessory {
        case chevron
        case toggle(isOn: Bool)
        case value(String)
    }

    var body: some View {
        HStack(spacing: Spacing.s300) {
            Image(systemName: systemImage)
                .font(.system(size: 16))
                .foregroundStyle(LGColor.textMuted)
                .frame(width: 24)

            Text(label)
                .font(.system(size: 15))
                .foregroundStyle(LGColor.textPrimary)

            Spacer()

            switch accessory {
            case .chevron:
                Image(systemName: "chevron.right")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(LGColor.textSubtle)

            case let .toggle(isOn):
                RoundedRectangle(cornerRadius: 14)
                    .fill(isOn ? LGColor.accentBlue : LGColor.surfaceRaised)
                    .frame(width: 44, height: 26)
                    .overlay(
                        Circle()
                            .fill(LGColor.textTitle)
                            .frame(width: 20, height: 20)
                            .offset(x: isOn ? 9 : -9)
                    )

            case let .value(text):
                Text(text)
                    .font(.system(size: 14))
                    .foregroundStyle(LGColor.textSubtle)
            }
        }
        .padding(.vertical, Spacing.s300)
        .padding(.horizontal, Spacing.s400)
    }
}

// MARK: - InitialsAvatarView

struct InitialsAvatarView: View {
    let initials: String
    let style: DirectionStyle
    let size: CGFloat

    var body: some View {
        ZStack {
            Circle()
                .fill(LGColor.surfaceRaised)
                .overlay(
                    Circle()
                        .stroke(style.accent, lineWidth: 2)
                )

            Text(initials)
                .font(.system(size: size * 0.35, weight: .semibold, design: .rounded))
                .foregroundStyle(LGColor.textTitle)
        }
        .frame(width: size, height: size)
    }
}

// MARK: - ActiveDownloadBannerView

struct ActiveDownloadBannerView: View {
    let file: OMDFixtures.MediaFile
    let progress: Double
    let style: DirectionStyle

    var body: some View {
        HStack(spacing: Spacing.s300) {
            ZStack {
                Circle()
                    .stroke(style.accent.opacity(0.2), lineWidth: 2)
                Circle()
                    .trim(from: 0, to: progress)
                    .stroke(style.accent, style: StrokeStyle(lineWidth: 2, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                    .shadow(color: style.monospacedNumerics ? style.accent.opacity(0.6) : .clear, radius: 3)
            }
            .frame(width: 22, height: 22)

            VStack(alignment: .leading, spacing: 2) {
                Text(file.title)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(LGColor.textPrimary)
                    .lineLimit(1)

                Text(
                    style.monospacedNumerics
                        ? String(format: "%.0f%%", progress * 100)
                        : "Downloading..."
                )
                .font(
                    style.monospacedNumerics
                        ? .system(size: 10, design: .monospaced)
                        : .system(size: 10)
                )
                .foregroundStyle(style.accent)
            }

            Spacer()

            Button {} label: {
                Image(systemName: "xmark.circle.fill")
                    .font(.system(size: 18))
                    .foregroundStyle(LGColor.textSubtle)
            }
            .frame(minWidth: 44, minHeight: 44)
            .contentShape(.rect)
        }
        .padding(.horizontal, Spacing.s400)
        .padding(.vertical, Spacing.s200)
        .background(
            style.usesCard
                ? (style.monospacedNumerics
                    ? AnyShapeStyle(.ultraThinMaterial)
                    : AnyShapeStyle(LGColor.surfaceRaised))
                : AnyShapeStyle(LGColor.surfaceRaised)
        )
        .overlay(alignment: .top) {
            Rectangle()
                .fill(LGColor.borderSubtle)
                .frame(height: 0.5)
        }
    }
}

// MARK: - Helpers

private func formattedViews(_ count: Int) -> String {
    if count >= 1_000_000 {
        return String(format: "%.1fM", Double(count) / 1_000_000)
    } else if count >= 1000 {
        return String(format: "%.1fK", Double(count) / 1000)
    }
    return "\(count)"
}

// MARK: - Previews

#Preview("Shared Components — Neon Console") {
    ScrollView {
        VStack(spacing: Spacing.s400) {
            MediaThumbnailView(file: OMDFixtures.sampleFiles[0], style: .neonConsole)
                .frame(maxWidth: .infinity)

            FileRowNeon(file: OMDFixtures.sampleFiles[0])
            FileRowNeon(file: OMDFixtures.sampleFiles[1])

            StatCardView(
                label: "Downloads",
                value: "47",
                systemImage: "arrow.down.circle.fill",
                style: .neonConsole
            )
            .neonCard(accent: LGColor.accentBlue)

            SettingRowView(
                systemImage: "wifi",
                label: "Cellular Downloads",
                accessory: .toggle(isOn: false)
            )

            InitialsAvatarView(initials: "JL", style: .neonConsole, size: 64)

            ActiveDownloadBannerView(
                file: OMDFixtures.sampleFiles[1],
                progress: 0.62,
                style: .neonConsole
            )
        }
        .padding(Spacing.s400)
    }
    .background(LGColor.surfaceBase)
    .preferredColorScheme(.dark)
}

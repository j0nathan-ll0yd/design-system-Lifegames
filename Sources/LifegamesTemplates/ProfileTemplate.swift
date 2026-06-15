import LifegamesComponents
import LifegamesComponentsCore
import LifegamesTokens
import SwiftUI

/// **Status:** Experimental
///
/// Brand-agnostic profile shell. The design system owns the profile
/// LAYOUT/chrome (centered header zone over a scrolling content zone); the host
/// fills identity into the `header` slot (e.g. `InitialsAvatarView` + name /
/// email / badge) and the body into `content` (stats, rows, actions). Identity
/// is deliberately NOT typed name/email params — that presumed a person and
/// broke slot purity. The `accent` (default `LGColor.accentDefault`) tints the
/// ambient header glow only.
public struct ProfileTemplate<Header: View, Content: View>: View {
    public var accent: Color
    public let header: Header
    public let content: Content

    public init(
        accent: Color = LGColor.accentDefault,
        @ViewBuilder header: () -> Header,
        @ViewBuilder content: () -> Content
    ) {
        self.accent = accent
        self.header = header()
        self.content = content()
    }

    public var body: some View {
        ScrollView {
            VStack(spacing: Spacing.s600) {
                ZStack {
                    RadialGradient(
                        colors: [accent.opacity(0.12), .clear],
                        center: .top,
                        startRadius: 0,
                        endRadius: 240
                    )
                    header
                        .padding(.vertical, Spacing.s500)
                }

                content
                    .padding(.horizontal, Spacing.s400)
            }
            .padding(.bottom, Spacing.s800)
        }
        .background(LGColor.surfaceBase)
    }
}

// Preview fills the slots with neutral local mock content (no cross-module
// molecules) so the template's own preview stays self-contained; the
// swift-gallery "Templates" section demonstrates the real molecule fills
// (`InitialsAvatarView` / `MetricContentView`).
#Preview("Profile Template") {
    ProfileTemplate(accent: LGColor.accentBlue) {
        VStack(spacing: Spacing.s300) {
            Circle()
                .fill(LGColor.surfaceRaised)
                .overlay(Circle().stroke(LGColor.accentBlue, lineWidth: 2))
                .overlay(
                    Text("JL")
                        .font(.system(size: 28, weight: .semibold, design: .rounded))
                        .foregroundStyle(LGColor.textTitle)
                )
                .frame(width: 80, height: 80)
            VStack(spacing: Spacing.s100) {
                Text("Jordan Lee")
                    .font(.system(size: 20, weight: .bold, design: .rounded))
                    .foregroundStyle(LGColor.textTitle)
                Text("jordan@example.com")
                    .font(.system(size: 14))
                    .foregroundStyle(LGColor.textMuted)
            }
        }
    } content: {
        HStack(spacing: Spacing.s300) {
            MockStat(label: "Saved", value: "47", systemImage: "tray.fill")
            MockStat(label: "Storage", value: "2.4 GB", systemImage: "externaldrive.fill")
        }
    }
    .preferredColorScheme(.dark)
}

private struct MockStat: View {
    let label: String
    let value: String
    let systemImage: String

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.s100) {
            Image(systemName: systemImage)
                .font(.system(size: 14))
                .foregroundStyle(LGColor.accentBlue)
            Text(value)
                .font(.system(size: 16, weight: .bold, design: .rounded))
                .foregroundStyle(LGColor.textTitle)
            Text(label)
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(LGColor.textMuted)
                .textCase(.uppercase)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .neonCard(accent: LGColor.accentBlue)
    }
}

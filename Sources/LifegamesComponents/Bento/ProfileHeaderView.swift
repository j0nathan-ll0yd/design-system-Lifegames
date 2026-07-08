import LifegamesTokens
import SwiftUI

/// Compact identity header for the consolidated Settings screen.
///
/// Matches the `.identity-card` design from `variation-1b-datastream-real.html`:
/// a 58×58 indigo-gradient avatar with glow ring, left-aligned name/role, italic bio,
/// small-caps tagline, and two frosted-glass social pills. Intentionally more compact
/// than `IdentityCardView` — left-aligned layout suits a narrow settings column.
///
/// Usage:
/// ```swift
/// ProfileHeaderView(
///     initials: "JL",
///     name: "Jonathan Lloyd",
///     role: "Engineering Director",
///     bio: "A living data dashboard — tracking body and mind.",
///     tagline: "Live Engineering Dashboard"
/// )
/// ```
public struct ProfileHeaderView: View {
    public let initials: String
    public let name: String
    public let role: String
    public let bio: String
    public let tagline: String
    public let githubLabel: String
    public let linkedinLabel: String
    public let githubURL: URL?
    public let linkedinURL: URL?

    public init(
        initials: String,
        name: String,
        role: String,
        bio: String,
        tagline: String,
        githubLabel: String = "GitHub",
        linkedinLabel: String = "LinkedIn",
        githubURL: URL? = nil,
        linkedinURL: URL? = nil
    ) {
        self.initials = initials
        self.name = name
        self.role = role
        self.bio = bio
        self.tagline = tagline
        self.githubLabel = githubLabel
        self.linkedinLabel = linkedinLabel
        self.githubURL = githubURL
        self.linkedinURL = linkedinURL
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Identity row: avatar + name/role
            HStack(spacing: 14) {
                avatarView
                VStack(alignment: .leading, spacing: 3) {
                    Text(name)
                        .font(.system(size: 17, weight: .bold))
                        .foregroundStyle(LGColor.textTitle)
                    Text(role.uppercased())
                        .font(.system(size: 9.5, weight: .bold))
                        .kerning(1.3)
                        .foregroundStyle(LGColor.accentIndigo)
                        .opacity(0.85)
                }
            }
            .padding(.bottom, 13)

            // Bio
            Text(bio)
                .font(.system(size: 11.5, weight: .light))
                .italic()
                .foregroundStyle(LGColor.textMuted)
                .lineSpacing(3)
                .padding(.bottom, 11)

            // Tagline
            Text(tagline.uppercased())
                .font(.system(size: 8.5, weight: .bold))
                .kerning(1.9)
                .foregroundStyle(LGColor.textSubtle)
                .opacity(0.6)
                .padding(.bottom, 10)

            // Social pills
            HStack(spacing: 7) {
                socialPill(githubLabel, url: githubURL)
                socialPill(linkedinLabel, url: linkedinURL)
            }
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background {
            // Layer order: material blur (back) → white tint → indigo glow (front)
            RoundedRectangle(cornerRadius: 20)
                .fill(.ultraThinMaterial)
            RoundedRectangle(cornerRadius: 20)
                .fill(Color.white.opacity(0.048))
            RadialGradient(
                colors: [LGColor.accentIndigo.opacity(0.10), .clear],
                center: .topLeading,
                startRadius: 0,
                endRadius: 140
            )
            .clipShape(RoundedRectangle(cornerRadius: 20))
        }
        .clipShape(RoundedRectangle(cornerRadius: 20))
        .overlay {
            RoundedRectangle(cornerRadius: 20)
                .stroke(Color.white.opacity(0.12), lineWidth: 1)
        }
    }

    // MARK: - Avatar

    private var avatarView: some View {
        ZStack {
            Circle()
                .fill(
                    LinearGradient(
                        colors: [LGColor.accentIndigo, LGColor.accentPink, LGColor.accentBlue],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: 58, height: 58)
                .shadow(color: LGColor.accentIndigo.opacity(0.30), radius: 9)
                .overlay(
                    Circle()
                        .stroke(LGColor.accentIndigo.opacity(0.45), lineWidth: 2.5)
                )

            Text(initials)
                .font(.system(size: 20, weight: .bold))
                .foregroundStyle(Color.white.opacity(0.92))
        }
    }

    // MARK: - Social pill

    /// Renders as a tappable `Link` when a destination is provided; a plain
    /// label otherwise, so existing call sites keep their non-interactive pills.
    @ViewBuilder
    private func socialPill(_ label: String, url: URL?) -> some View {
        if let url {
            Link(destination: url) {
                pillLabel(label)
            }
            .accessibilityLabel(label)
        } else {
            pillLabel(label)
        }
    }

    private func pillLabel(_ label: String) -> some View {
        Text(label)
            .font(.system(size: 11, weight: .medium))
            .foregroundStyle(LGColor.textMuted)
            .padding(.horizontal, 11)
            .padding(.vertical, 5)
            .background(Color.white.opacity(0.055))
            .clipShape(Capsule())
            .overlay(
                Capsule()
                    .stroke(Color.white.opacity(0.10), lineWidth: 1)
            )
    }
}

// MARK: - Preview

#if os(iOS)
    #Preview("Profile Header") {
        ProfileHeaderView(
            initials: "JL",
            name: "Jonathan Lloyd",
            role: "Engineering Director",
            bio: "A living data dashboard — tracking body and mind. Jack into his human datastream.",
            tagline: "Live Engineering Dashboard",
            githubURL: URL(string: "https://github.com/j0nathan-ll0yd"),
            linkedinURL: URL(string: "https://www.linkedin.com/in/lifegames/")
        )
        .padding(Spacing.s400)
        .background(LGColor.surfaceBase)
        .preferredColorScheme(.dark)
    }
#endif

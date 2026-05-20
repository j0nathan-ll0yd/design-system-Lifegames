import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct IdentityCardView: View {
    public let props: IdentityCardProps

    public init(props: IdentityCardProps) {
        self.props = props
    }

    public var body: some View {
        VStack(spacing: 16) {
            Circle()
                .fill(
                    LinearGradient(
                        colors: [Color.colorAccentPink.opacity(0.3), Color.colorAccentBlue.opacity(0.2)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: 80, height: 80)
                .overlay(
                    Circle()
                        .stroke(Color.colorAccentPink.opacity(0.25), lineWidth: 1.5)
                )
                .overlay(
                    Image(systemName: "person.fill")
                        .font(.system(size: 30))
                        .foregroundStyle(Color.colorAccentPink.opacity(0.5))
                )

            VStack(spacing: 4) {
                Text(props.name)
                    .font(.system(size: 20, weight: .bold))
                    .foregroundStyle(Color.colorTextTitle)
                Text(props.title)
                    .font(.system(size: 10, weight: .medium))
                    .kerning(2)
                    .foregroundStyle(Color.colorAccentPink)
                    .textCase(.uppercase)
            }

            Text(props.bio)
                .font(.system(size: 12))
                .italic()
                .foregroundStyle(Color.colorTextMuted)
                .multilineTextAlignment(.center)

            Text(props.tagline)
                .font(.system(size: 11))
                .foregroundStyle(Color.colorTextMuted.opacity(0.7))

            HStack(spacing: 12) {
                NeonPillButton(label: "GitHub")
                NeonPillButton(label: "LinkedIn")
            }
        }
        .padding(24)
        .glassCard(tint: Color.colorAccentPink)
    }
}

private struct NeonPillButton: View {
    let label: String

    var body: some View {
        Text(label)
            .font(.system(size: 11, weight: .semibold))
            .foregroundStyle(Color.colorAccentBlue)
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .background(Color.colorAccentBlue.opacity(0.1))
            .clipShape(Capsule())
            .overlay(
                Capsule()
                    .stroke(Color.colorAccentBlue.opacity(0.3), lineWidth: 1)
            )
    }
}

#Preview("Identity Card") {
    IdentityCardView(props: IdentityCardProps(
        name: "Jonathan Lloyd",
        title: "Engineering Director",
        bio: "Building things that matter, one commit at a time.",
        tagline: "Welcome to my human datastream.",
        githubUrl: "https://github.com/j0nathan-ll0yd",
        linkedinUrl: "https://linkedin.com/in/jonathanlloyd"
    ))
    .padding()
    .background(Color.colorSurfaceBase)
    .preferredColorScheme(.dark)
}

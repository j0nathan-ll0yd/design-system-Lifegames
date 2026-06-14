import LifegamesTokens
import SwiftUI

/// **Status:** Experimental
///
/// Brand-agnostic initials avatar: monogram text inside a ring. The ring color
/// is an injected semantic `accent` (default `LGColor.accentDefault`); the fill
/// and text resolve to semantic tokens. Consumed by `ProfileScaffold`'s header
/// slot and any identity surface.
public struct InitialsAvatarView: View {
    public let initials: String
    public var accent: Color
    public var size: CGFloat

    public init(
        initials: String,
        accent: Color = LGColor.accentDefault,
        size: CGFloat = 64
    ) {
        self.initials = initials
        self.accent = accent
        self.size = size
    }

    public var body: some View {
        ZStack {
            Circle()
                .fill(LGColor.surfaceRaised)
                .overlay(
                    Circle()
                        .stroke(accent, lineWidth: 2)
                )

            Text(initials)
                .font(.system(size: size * 0.35, weight: .semibold, design: .rounded))
                .foregroundStyle(LGColor.textTitle)
        }
        .frame(width: size, height: size)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(Text("Avatar"))
        .accessibilityValue(Text(initials))
    }
}

#Preview("Initials Avatar") {
    HStack(spacing: 20) {
        InitialsAvatarView(initials: "JL")
        InitialsAvatarView(initials: "AB", accent: LGColor.accentBlue, size: 80)
        InitialsAvatarView(initials: "MK", accent: LGColor.accentPink, size: 48)
    }
    .padding()
    .background(LGColor.surfaceBase)
    .preferredColorScheme(.dark)
}

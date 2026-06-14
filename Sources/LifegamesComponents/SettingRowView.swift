import LifegamesTokens
import SwiftUI

/// **Status:** Experimental
///
/// Brand-agnostic settings row: a leading SF Symbol, a host-owned
/// `LocalizedStringKey` label, and a trailing accessory (chevron / toggle /
/// value). The toggle's on-state tint is an injected semantic `accent`
/// (default `LGColor.accentDefault`); all other colors resolve to semantic
/// tokens. Guarantees a 44pt minimum touch target (S70) and combines its
/// children for VoiceOver. Its contract is pinned by `SettingsScaffold`.
public struct SettingRowView: View {
    public let systemImage: String
    public let label: LocalizedStringKey
    public let accessory: SettingAccessory
    public var accent: Color

    public enum SettingAccessory {
        case chevron
        case toggle(isOn: Bool)
        case value(LocalizedStringKey)
    }

    public init(
        systemImage: String,
        label: LocalizedStringKey,
        accessory: SettingAccessory,
        accent: Color = LGColor.accentDefault
    ) {
        self.systemImage = systemImage
        self.label = label
        self.accessory = accessory
        self.accent = accent
    }

    public var body: some View {
        HStack(spacing: Spacing.s300) {
            Image(systemName: systemImage)
                .font(.system(size: 16))
                .foregroundStyle(LGColor.textMuted)
                .frame(width: 24)

            Text(label)
                .font(.system(size: 15))
                .foregroundStyle(LGColor.textPrimary)

            Spacer()

            accessoryView
        }
        .padding(.vertical, Spacing.s300)
        .padding(.horizontal, Spacing.s400)
        .frame(minHeight: 44)
        .contentShape(.rect)
        .accessibilityElement(children: .combine)
    }

    @ViewBuilder
    private var accessoryView: some View {
        switch accessory {
        case .chevron:
            Image(systemName: "chevron.right")
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(LGColor.textSubtle)

        case let .toggle(isOn):
            RoundedRectangle(cornerRadius: 14)
                .fill(isOn ? accent : LGColor.surfaceRaised)
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
}

#Preview("Setting Rows") {
    VStack(spacing: 0) {
        SettingRowView(systemImage: "person.fill", label: "Account", accessory: .chevron)
        SettingRowView(
            systemImage: "wifi",
            label: "Cellular Downloads",
            accessory: .toggle(isOn: true),
            accent: LGColor.accentBlue
        )
        SettingRowView(systemImage: "externaldrive.fill", label: "Storage", accessory: .value("2.4 GB"))
    }
    .padding()
    .background(LGColor.surfaceBase)
    .preferredColorScheme(.dark)
}

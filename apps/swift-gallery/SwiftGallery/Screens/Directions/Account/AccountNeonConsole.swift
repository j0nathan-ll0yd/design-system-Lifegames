import LifegamesComponents
import LifegamesComponentsCore
import LifegamesTokens
import SwiftUI

struct AccountNeonConsole: View {
    private let user = OMDFixtures.sampleUser
    private let style = DirectionStyle.neonConsole

    var body: some View {
        ScrollView {
            VStack(spacing: Spacing.s500) {
                headerSection
                statSection
                settingsSections
                signOutButton
            }
            .padding(Spacing.s400)
        }
        .background(LGColor.surfaceBase.ignoresSafeArea())
        #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
        #endif
            .navigationTitle("Account")
    }

    private var headerSection: some View {
        HStack(spacing: Spacing.s400) {
            InitialsAvatarView(initials: user.initials, style: style, size: 72)
                .shadow(color: LGColor.accentBlue.opacity(0.5), radius: 12)

            VStack(alignment: .leading, spacing: Spacing.s100) {
                Text(user.name)
                    .font(.system(size: 20, weight: .bold))
                    .foregroundStyle(LGColor.textTitle)

                Text(user.email)
                    .font(.system(size: 13, design: .monospaced))
                    .foregroundStyle(LGColor.accentBlue)
            }

            Spacer()
        }
        .padding(Spacing.s450)
        .neonCard(accent: LGColor.accentCyan)
    }

    private var statSection: some View {
        VStack(alignment: .leading, spacing: Spacing.s200) {
            Text("Activity")
                .font(.system(size: 11, weight: .semibold, design: .monospaced))
                .foregroundStyle(LGColor.accentBlue)
                .textCase(.uppercase)
                .tracking(1.5)

            HStack(alignment: .top, spacing: Spacing.s300) {
                statCard(
                    label: "Downloads",
                    value: "\(user.downloadCount)",
                    systemImage: "arrow.down.circle.fill",
                    accent: LGColor.accentBlue
                )

                statCard(
                    label: "Storage",
                    value: user.storageUsed,
                    systemImage: "internaldrive.fill",
                    accent: LGColor.accentPink
                )

                statCard(
                    label: "Plays",
                    value: "\(user.playCount)",
                    systemImage: "play.circle.fill",
                    accent: LGColor.accentCyan
                )
            }
        }
    }

    private func statCard(
        label: String,
        value: String,
        systemImage: String,
        accent: Color
    ) -> some View {
        StatCardView(
            label: label,
            value: value,
            systemImage: systemImage,
            style: style
        )
        .frame(maxWidth: .infinity, alignment: .leading)
        .neonCard(accent: accent)
        .shadow(color: accent.opacity(0.3), radius: 8)
    }

    private var settingsSections: some View {
        VStack(spacing: Spacing.s400) {
            neonSettingsGroup(
                title: "Account",
                accent: LGColor.accentBlue,
                rows: [
                    ("person.circle", "Edit Profile", SettingRowView.SettingAccessory.chevron),
                    ("key.fill", "Change Password", .chevron),
                    ("bell.badge.fill", "Notifications", .chevron),
                ]
            )

            neonSettingsGroup(
                title: "Preferences",
                accent: LGColor.accentCyan,
                rows: [
                    ("moon.fill", "Dark Mode", .toggle(isOn: true)),
                    ("globe", "Language", .value("English")),
                    ("hand.raised.fill", "Privacy", .chevron),
                ]
            )

            neonSettingsGroup(
                title: "Support",
                accent: LGColor.accentPink,
                rows: [
                    ("questionmark.circle.fill", "Help Center", .chevron),
                    ("ant.fill", "Report a Bug", .chevron),
                    ("info.circle.fill", "About", .value("v2.4.1")),
                ]
            )
        }
    }

    private func neonSettingsGroup(
        title: String,
        accent: Color,
        rows: [(String, String, SettingRowView.SettingAccessory)]
    ) -> some View {
        VStack(alignment: .leading, spacing: Spacing.s200) {
            Text(title)
                .font(.system(size: 11, weight: .semibold, design: .monospaced))
                .foregroundStyle(accent)
                .textCase(.uppercase)
                .tracking(1.5)

            VStack(spacing: 0) {
                ForEach(Array(rows.enumerated()), id: \.offset) { _, row in
                    SettingRowView(systemImage: row.0, label: row.1, accessory: row.2)
                }
            }
            .neonCard(accent: accent)
        }
    }

    private var signOutButton: some View {
        Button {} label: {
            HStack {
                Spacer()
                Text("Sign Out")
                    .font(.system(size: 16, weight: .semibold, design: .monospaced))
                    .foregroundStyle(LGColor.accentPink)
                Spacer()
            }
            .padding(.vertical, Spacing.s400)
            .background(LGColor.accentPink.opacity(0.08))
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(LGColor.accentPink.opacity(0.5), lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .shadow(color: LGColor.accentPink.opacity(0.2), radius: 8)
        }
        .frame(minWidth: 44, minHeight: 44)
        .contentShape(.rect)
    }
}

#Preview("Account — Neon Console") {
    NavigationStack {
        AccountNeonConsole()
    }
    .background(LGColor.surfaceBase)
    .preferredColorScheme(.dark)
}

import LifegamesComponents
import LifegamesComponentsCore
import LifegamesTemplates
import LifegamesTokens
import SwiftUI

struct AccountNeonConsole: View {
    private let user = OMDFixtures.sampleUser
    private let style = DirectionStyle.neonConsole

    var body: some View {
        // Built on ProfileTemplate: the template owns the centered header zone
        // (with the accent glow) over a scrolling content zone + the surface
        // background. The OMD identity card fills `header`; stats, settings, and
        // sign-out fill `content`. Nav chrome stays host-owned.
        ProfileTemplate(accent: LGColor.accentCyan) {
            headerSection
        } content: {
            VStack(spacing: Spacing.s500) {
                statSection
                settingsSections
                signOutButton
            }
        }
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
        .navigationTitle("Account")
    }

    private var headerSection: some View {
        HStack(spacing: Spacing.s400) {
            LifegamesComponents.InitialsAvatarView(initials: user.initials, accent: LGColor.accentCyan, size: 72)
                .shadow(color: LGColor.accentBlue.opacity(0.5), radius: 12)

            VStack(alignment: .leading, spacing: Spacing.s100) {
                Text(user.name)
                    .font(OMDFont.bold(20))
                    .foregroundStyle(LGColor.textTitle)

                Text(user.email)
                    .font(OMDFont.mono(13))
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
                .font(OMDFont.semibold(11))
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
        MetricContentView(
            label: label,
            value: value,
            systemImage: systemImage,
            accent: accent
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
                    ("person.circle", "Edit Profile", LifegamesComponents.SettingRowView.SettingAccessory.chevron),
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
        rows: [(String, String, LifegamesComponents.SettingRowView.SettingAccessory)]
    ) -> some View {
        VStack(alignment: .leading, spacing: Spacing.s200) {
            Text(title)
                .font(OMDFont.semibold(11))
                .foregroundStyle(accent)
                .textCase(.uppercase)
                .tracking(1.5)

            VStack(spacing: 0) {
                ForEach(Array(rows.enumerated()), id: \.offset) { _, row in
                    SettingRowView(
                        systemImage: row.0,
                        label: LocalizedStringKey(row.1),
                        accessory: row.2,
                        accent: accent
                    )
                }
            }
            .neonCard(accent: accent)
        }
    }

    /// Sign Out is the screen's one generic destructive CTA, so it adopts the
    /// DS `LGButton` (`.destructive` variant → the canonical destructive token).
    /// The custom neon settings rows / radio cards above stay bespoke; only this
    /// standard CTA is promoted to the shared primitive.
    private var signOutButton: some View {
        LGButton("Sign Out", variant: .destructive) {}
    }
}

#Preview("Account — Neon Console") {
    NavigationStack {
        AccountNeonConsole()
    }
    .background(LGColor.surfaceBase)
    .preferredColorScheme(.dark)
}

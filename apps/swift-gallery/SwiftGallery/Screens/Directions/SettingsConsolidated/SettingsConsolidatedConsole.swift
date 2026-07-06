import LifegamesComponents
import LifegamesTokens
import SwiftUI

// MARK: - SettingsConsolidatedScreen

enum SettingsConsolidatedScreen {
    static let entry = ScreenEntry(
        id: "settings-consolidated",
        title: "Settings · Consolidated",
        directions: [
            ScreenDirection(id: "consolidated", label: "Consolidated") {
                AnyView(SettingsConsolidatedView())
            },
        ]
    )
}

// MARK: - SettingsConsolidatedView

/// Presentational mock of the consolidated Settings screen.
/// No live data, no reducers — fixture values only. Gallery-only.
struct SettingsConsolidatedView: View {
    @State private var useRealHR = true

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Spacing.s400) {
                identityBlock
                versionRow
                dataMgmtSection
                dataModeSection
                savedPlacesSection
                diagnosticsSection
            }
            .padding(.horizontal, Spacing.s400)
            .padding(.vertical, Spacing.s500)
        }
        .background(LGColor.surfaceBase)
    }

    // MARK: - Identity

    private var identityBlock: some View {
        ProfileHeaderView(
            initials: "JL",
            name: "Jonathan Lloyd",
            role: "Engineering Director",
            bio: "A living data dashboard — tracking body and mind. Jack into his human datastream.",
            tagline: "Live Engineering Dashboard"
        )
        .frame(maxWidth: .infinity)
    }

    // MARK: - Version

    private var versionRow: some View {
        HStack {
            Spacer()
            Text("v1.0 · Build 42 · iOS 26+")
                .font(.system(size: 11, design: .monospaced))
                .foregroundStyle(LGColor.textMuted.opacity(0.5))
            Spacer()
        }
        .padding(.vertical, Spacing.s100)
    }

    // MARK: - DATA MANAGEMENT section

    private var dataMgmtSection: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "Data Management", dotColor: LGColor.purple400, timestamp: "")

            VStack(alignment: .leading, spacing: Spacing.s300) {
                settingsRow(label: "Total Visits", value: "1,204")
                Divider().overlay(LGColor.textMuted.opacity(0.12))
                settingsRow(label: "Unsynced", value: "3")
                Divider().overlay(LGColor.textMuted.opacity(0.12))
                settingsRow(label: "Last Sync", value: "2:14 PM")

                // Compact tinted pill actions — one HStack of three equal pills
                HStack(spacing: 7) {
                    SettingsPillButton("Sync Now", accent: LGColor.accentPurple) {}
                    SettingsPillButton("Full Re-sync", accent: LGColor.accentAmber) {}
                    SettingsPillButton("Delete All", accent: LGColor.healthRed) {}
                }
            }
            .neonCard(accent: LGColor.accentPurple)
        }
    }

    // MARK: - DATA MODE section

    private var dataModeSection: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "Data Mode", dotColor: LGColor.accentPink, timestamp: "")

            VStack(alignment: .leading, spacing: Spacing.s300) {
                HStack {
                    VStack(alignment: .leading, spacing: Spacing.s100) {
                        Text("Use Real HR")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundStyle(LGColor.textTitle)
                        Text("Real data active")
                            .font(.system(size: 12))
                            .foregroundStyle(LGColor.textMuted)
                    }
                    Spacer()
                    Toggle("", isOn: $useRealHR)
                        .labelsHidden()
                        .tint(LGColor.accentPink)
                }
            }
            .neonCard(accent: LGColor.accentPink)
        }
    }

    // MARK: - SAVED PLACES section

    private var savedPlacesSection: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "Saved Places", dotColor: LGColor.accentPink, timestamp: "")

            HStack {
                VStack(alignment: .leading, spacing: Spacing.s100) {
                    Text("Saved Places")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(LGColor.textTitle)
                    Text("Home, Work & 3 more")
                        .font(.system(size: 12))
                        .foregroundStyle(LGColor.textMuted)
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(LGColor.textMuted.opacity(0.4))
                    .accessibilityHidden(true)
            }
            .neonCard(accent: LGColor.accentPink)
        }
    }

    // MARK: - DIAGNOSTICS section

    private var diagnosticsSection: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "Diagnostics", dotColor: LGColor.accentIndigo, timestamp: "")

            VStack(alignment: .leading, spacing: Spacing.s300) {
                HStack {
                    VStack(alignment: .leading, spacing: Spacing.s100) {
                        Text("Watch Log")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundStyle(LGColor.textTitle)
                        Text("128 entries · 4.2 KB")
                            .font(.system(size: 12, design: .monospaced))
                            .foregroundStyle(LGColor.textMuted)
                    }
                    Spacer()
                }

                // Indigo pill actions — one HStack of three equal pills
                HStack(spacing: 7) {
                    SettingsPillButton("Share Log", accent: LGColor.accentIndigo) {}
                    SettingsPillButton("Clear", accent: LGColor.accentIndigo) {}
                    SettingsPillButton("Reload", accent: LGColor.accentIndigo) {}
                }
            }
            .neonCard(accent: LGColor.accentIndigo)
        }
    }

    // MARK: - Helpers

    private func settingsRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(.system(size: 14))
                .foregroundStyle(LGColor.textTitle)
            Spacer()
            Text(value)
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(LGColor.textMuted)
        }
    }
}

#Preview("Settings · Consolidated") {
    SettingsConsolidatedView()
        .preferredColorScheme(.dark)
}

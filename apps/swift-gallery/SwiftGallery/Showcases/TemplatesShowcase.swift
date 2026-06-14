import LifegamesComponents
import LifegamesComponentsCore
import LifegamesTemplates
import LifegamesTokens
import SwiftUI

/// Catalog of the brand-agnostic `LifegamesTemplates` scaffolds. Mirrors the
/// `Screens/` pattern: a List of rows, each `NavigationLink`-ing to a detail
/// view that renders ONE scaffold full-viewport (full-bleed, as it appears in
/// an app), filled with NEUTRAL mock content — no OMD types. This is distinct
/// from the OMD `Screens/` exploration, which dogfoods the same scaffolds with
/// real app data.
struct TemplatesShowcase: View {
    var body: some View {
        List(TemplateCatalogEntry.all) { entry in
            NavigationLink(destination: TemplateDetailView(entry: entry)) {
                VStack(alignment: .leading, spacing: Spacing.s50) {
                    Text(entry.title)
                        .font(.system(size: 16, weight: .semibold, design: .monospaced))
                        .foregroundStyle(LGColor.textTitle)

                    Text(entry.subtitle)
                        .font(.system(size: 12))
                        .foregroundStyle(LGColor.textMuted)
                }
                .padding(.vertical, Spacing.s100)
            }
        }
        .listStyle(.plain)
        .background(LGColor.surfaceBase)
        .navigationTitle("Templates")
        #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
        #endif
            .preferredColorScheme(.dark)
    }
}

// MARK: - Catalog model

struct TemplateCatalogEntry: Identifiable {
    let id: String
    let title: String
    let subtitle: String

    static let all: [TemplateCatalogEntry] = [
        TemplateCatalogEntry(id: "auth", title: "AuthScaffold", subtitle: "Launch / Login branded shell"),
        TemplateCatalogEntry(id: "settings", title: "SettingsScaffold", subtitle: "Closed-taxonomy settings list"),
        TemplateCatalogEntry(id: "profile", title: "ProfileScaffold", subtitle: "Identity header + content body"),
        TemplateCatalogEntry(id: "list", title: "ListScaffold", subtitle: "Generic list + empty state"),
    ]
}

// MARK: - Detail dispatch

struct TemplateDetailView: View {
    let entry: TemplateCatalogEntry

    var body: some View {
        Group {
            switch entry.id {
            case "auth": AuthTemplateDetail()
            case "settings": SettingsTemplateDetail()
            case "profile": ProfileTemplateDetail()
            case "list": ListTemplateDetail()
            default: EmptyView()
            }
        }
        .navigationTitle(entry.title)
        #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
        #endif
            .preferredColorScheme(.dark)
    }
}

// MARK: - Auth

private struct AuthTemplateDetail: View {
    var body: some View {
        AuthScaffold(
            title: "Welcome",
            subtitle: "Your library, ready offline.",
            accent: LGColor.accentBlue
        ) {
            Image(systemName: "square.stack.3d.up.fill")
                .font(.system(size: 56))
                .foregroundStyle(LGColor.accentBlue)
        } primaryAction: {
            Button {} label: {
                Text("Continue")
                    .font(.system(size: 16, weight: .semibold))
                    .frame(maxWidth: .infinity)
                    .frame(minHeight: 44)
            }
            .buttonStyle(.borderedProminent)
            .tint(LGColor.accentBlue)
        } footer: {
            Text("By continuing you agree to the Terms.")
                .font(.system(size: 12))
                .foregroundStyle(LGColor.textSubtle)
                .multilineTextAlignment(.center)
        }
    }
}

// MARK: - Settings

private struct SettingsTemplateDetail: View {
    @State private var cellular = true
    @State private var autoplay = false

    var body: some View {
        SettingsScaffold(
            sections: [
                SettingsScaffold.Section(title: "General", rows: [
                    .navigation(label: "Account", systemImage: "person.fill", action: {}),
                    .toggle(label: "Cellular Downloads", systemImage: "wifi", isOn: $cellular),
                    .toggle(label: "Autoplay", systemImage: "play.fill", isOn: $autoplay),
                    .value(label: "Storage Used", systemImage: "externaldrive.fill", value: "2.4 GB"),
                ]),
                SettingsScaffold.Section(title: "Danger Zone", footer: "This cannot be undone.", rows: [
                    .destructive(label: "Delete Account", systemImage: "trash.fill", action: {}),
                ]),
            ],
            accent: LGColor.accentBlue
        )
    }
}

// MARK: - Profile

private struct ProfileTemplateDetail: View {
    var body: some View {
        ProfileScaffold(accent: LGColor.accentPink) {
            VStack(spacing: Spacing.s300) {
                LifegamesComponents.InitialsAvatarView(initials: "JL", accent: LGColor.accentPink, size: 72)
                VStack(spacing: Spacing.s50) {
                    Text("Jordan Lee")
                        .font(.system(size: 18, weight: .bold, design: .rounded))
                        .foregroundStyle(LGColor.textTitle)
                    Text("jordan@example.com")
                        .font(.system(size: 13))
                        .foregroundStyle(LGColor.textMuted)
                }
            }
        } content: {
            HStack(spacing: Spacing.s300) {
                MetricContentView(label: "Saved", value: "47", systemImage: "tray.fill", accent: LGColor.accentBlue)
                    .neonCard(accent: LGColor.accentBlue)
                MetricContentView(label: "Storage", value: "2.4 GB", systemImage: "externaldrive.fill", accent: LGColor.accentAmber)
                    .neonCard(accent: LGColor.accentAmber)
            }
        }
    }
}

// MARK: - List

private struct ListTemplateDetail: View {
    var body: some View {
        ListScaffold(
            items: [
                TemplateMockRow(id: 1, title: "First Item", icon: "doc.fill"),
                TemplateMockRow(id: 2, title: "Second Item", icon: "doc.fill"),
                TemplateMockRow(id: 3, title: "Third Item", icon: "doc.fill"),
            ],
            accent: LGColor.accentBlue,
            emptyState: LGEmptyState(title: "Nothing Here", systemImage: "tray"),
            onRefresh: {}
        ) { item in
            HStack(spacing: Spacing.s300) {
                Image(systemName: item.icon)
                    .foregroundStyle(LGColor.accentBlue)
                Text(item.title)
                    .font(.system(size: 15))
                    .foregroundStyle(LGColor.textPrimary)
                Spacer()
            }
        }
    }
}

private struct TemplateMockRow: Identifiable {
    let id: Int
    let title: String
    let icon: String
}

#Preview("Templates Showcase") {
    NavigationStack {
        TemplatesShowcase()
    }
    .preferredColorScheme(.dark)
}

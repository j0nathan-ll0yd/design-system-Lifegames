import LifegamesComponents
import LifegamesComponentsCore
import LifegamesTemplates
import LifegamesTokens
import SwiftUI

/// Catalog of the brand-agnostic `LifegamesTemplates` templates. Mirrors the
/// `Screens/` pattern: a List of rows, each `NavigationLink`-ing to a detail
/// view that renders ONE template full-viewport (full-bleed, as it appears in
/// an app), filled with NEUTRAL mock content — no OMD types. This is distinct
/// from the OMD `Screens/` exploration, which dogfoods the same templates with
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
        TemplateCatalogEntry(id: "auth", title: "AuthTemplate", subtitle: "Launch / Login branded shell"),
        TemplateCatalogEntry(id: "settings", title: "SettingsTemplate", subtitle: "Closed-taxonomy settings list"),
        TemplateCatalogEntry(id: "profile", title: "ProfileTemplate", subtitle: "Identity header + content body"),
        TemplateCatalogEntry(id: "list", title: "ListTemplate", subtitle: "Generic list + empty state"),
        TemplateCatalogEntry(id: "detail", title: "DetailTemplate", subtitle: "Hero / metadata / description / actions"),
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
            case "detail": DetailTemplateDetail()
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
        AuthTemplate(
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
        SettingsTemplate(
            sections: [
                SettingsTemplate.Section(title: "General", rows: [
                    .navigation(label: "Account", systemImage: "person.fill", action: {}),
                    .toggle(label: "Cellular Downloads", systemImage: "wifi", isOn: $cellular),
                    .toggle(label: "Autoplay", systemImage: "play.fill", isOn: $autoplay),
                    .value(label: "Storage Used", systemImage: "externaldrive.fill", value: "2.4 GB"),
                ]),
                SettingsTemplate.Section(title: "Danger Zone", footer: "This cannot be undone.", rows: [
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
        ProfileTemplate(accent: LGColor.accentPink) {
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
        ListTemplate(
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

// MARK: - Detail

private struct DetailTemplateDetail: View {
    var body: some View {
        DetailTemplate(accent: LGColor.accentBlue) {
            RoundedRectangle(cornerRadius: 20)
                .fill(LGColor.surfaceRaised)
                .frame(height: 200)
                .overlay(
                    Image(systemName: "photo")
                        .font(.system(size: 48))
                        .foregroundStyle(LGColor.accentBlue.opacity(0.7))
                )
        } metadata: {
            VStack(alignment: .leading, spacing: Spacing.s300) {
                Text("Mock Detail")
                    .font(.system(size: 20, weight: .bold, design: .rounded))
                    .foregroundStyle(LGColor.textTitle)

                HStack(spacing: Spacing.s300) {
                    MetricContentView(label: "Views", value: "12K", systemImage: "eye.fill", accent: LGColor.accentBlue)
                        .neonCard(accent: LGColor.accentBlue)
                    MetricContentView(label: "Length", value: "8:42", systemImage: "timer", accent: LGColor.accentCyan)
                        .neonCard(accent: LGColor.accentCyan)
                    MetricContentView(label: "Size", value: "248 MB", systemImage: "internaldrive.fill", accent: LGColor.accentAmber)
                        .neonCard(accent: LGColor.accentAmber)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        } description: {
            VStack(alignment: .leading, spacing: Spacing.s200) {
                Text("ABOUT")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(LGColor.textMuted)
                    .textCase(.uppercase)
                Text("A neutral mock description block standing in for host-supplied long copy in the detail template's description slot. No OMD types appear here — this showcase fills the brand-agnostic slots with generic mock content.")
                    .font(.system(size: 14))
                    .foregroundStyle(LGColor.textPrimary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        } actions: {
            VStack(spacing: Spacing.s300) {
                LGButton("Primary Action", variant: .primary, accent: LGColor.accentBlue) {}
                LGButton("Secondary Action", variant: .secondary, accent: LGColor.accentBlue) {}
            }
        }
    }
}

#Preview("Templates Showcase") {
    NavigationStack {
        TemplatesShowcase()
    }
    .preferredColorScheme(.dark)
}

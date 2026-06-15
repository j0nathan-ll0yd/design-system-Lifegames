import LifegamesComponents
import LifegamesComponentsCore
import LifegamesTokens
import SwiftUI
import Testing
@testable import LifegamesTemplates

@Suite("LifegamesTemplates Templates Instantiate")
@MainActor
struct TemplateInstantiationTests {
    @Test func authTemplateLaunchInstantiates() {
        let view = AuthTemplate(title: "Welcome", subtitle: "Offline ready") {
            Image(systemName: "square.stack.3d.up.fill")
        }
        _ = view.body
    }

    @Test func authTemplateLoginInstantiates() {
        let view = AuthTemplate(
            title: "Sign In",
            accent: LGColor.accentBlue
        ) {
            Image(systemName: "square.stack.3d.up.fill")
        } primaryAction: {
            Button("Continue") {}
        } footer: {
            Text("Terms")
        }
        _ = view.body
    }

    @Test func authTemplateTitlelessBrandingOnlyInstantiates() {
        // A host whose branding slot carries a self-contained wordmark passes
        // `title: nil` so the template renders no second system-font headline.
        let view = AuthTemplate(accent: LGColor.accentBlue) {
            Text("OFFLINE")
        }
        #expect(view.title == nil)
        _ = view.body
    }

    @Test func authTemplateCustomBackgroundInstantiates() {
        // A host with a richer backdrop supplies its own full-bleed background.
        let view = AuthTemplate(accent: LGColor.accentBlue) {
            Text("OFFLINE")
        } background: {
            LinearGradient(
                colors: [LGColor.surfaceDeep, LGColor.surfaceBase],
                startPoint: .top,
                endPoint: .bottom
            )
        }
        _ = view.body
    }

    @Test func settingsTemplateInstantiates() {
        let toggle = Binding<Bool>(get: { true }, set: { _ in })
        let view = SettingsTemplate(
            sections: [
                SettingsTemplate.Section(title: "General", rows: [
                    .navigation(label: "Account", systemImage: "person.fill", action: {}),
                    .toggle(label: "Wi-Fi", systemImage: "wifi", isOn: toggle),
                    .value(label: "Storage", systemImage: "externaldrive.fill", value: "2.4 GB"),
                    .destructive(label: "Delete", systemImage: "trash.fill", action: {}),
                ]),
            ],
            accent: LGColor.accentBlue
        )
        #expect(view.sections.count == 1)
        #expect(view.sections[0].rows.count == 4)
        _ = view.body
    }

    @Test func profileTemplateInstantiates() {
        let view = ProfileTemplate(accent: LGColor.accentPink) {
            InitialsAvatarView(initials: "AB")
        } content: {
            Text("Body")
        }
        _ = view.body
    }

    @Test func listTemplatePopulatedInstantiates() {
        let view = ListTemplate(
            items: [PreviewItem(id: 1), PreviewItem(id: 2)],
            accent: LGColor.accentBlue,
            onRefresh: {}
        ) { item in
            Text("Item \(item.id)")
        }
        #expect(view.items.count == 2)
        _ = view.body
    }

    @Test func listTemplateEmptyInstantiates() {
        let view = ListTemplate(
            items: [PreviewItem](),
            emptyState: LGEmptyState(title: "Empty", systemImage: "tray")
        ) { item in
            Text("Item \(item.id)")
        }
        #expect(view.items.isEmpty)
        #expect(view.emptyState != nil)
        _ = view.body
    }

    @Test func detailTemplateInstantiates() {
        let view = DetailTemplate(accent: LGColor.accentBlue) {
            Rectangle()
        } metadata: {
            Text("Title")
        } description: {
            Text("About")
        } actions: {
            LGButton("Action") {}
        }
        _ = view.body
    }

    @Test func detailTemplateHeroOnlyInstantiates() {
        // metadata / description / actions default to EmptyView → sparse detail.
        let view = DetailTemplate {
            Rectangle()
        }
        _ = view.body
    }
}

private struct PreviewItem: Identifiable {
    let id: Int
}

import LifegamesComponents
import LifegamesComponentsCore
import LifegamesTokens
import SwiftUI
import Testing
@testable import LifegamesTemplates

@Suite("LifegamesTemplates Scaffolds Instantiate")
@MainActor
struct ScaffoldInstantiationTests {
    @Test func authScaffoldLaunchInstantiates() {
        let view = AuthScaffold(title: "Welcome", subtitle: "Offline ready") {
            Image(systemName: "square.stack.3d.up.fill")
        }
        _ = view.body
    }

    @Test func authScaffoldLoginInstantiates() {
        let view = AuthScaffold(
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

    @Test func authScaffoldTitlelessBrandingOnlyInstantiates() {
        // A host whose branding slot carries a self-contained wordmark passes
        // `title: nil` so the scaffold renders no second system-font headline.
        let view = AuthScaffold(accent: LGColor.accentBlue) {
            Text("OFFLINE")
        }
        #expect(view.title == nil)
        _ = view.body
    }

    @Test func authScaffoldCustomBackgroundInstantiates() {
        // A host with a richer backdrop supplies its own full-bleed background.
        let view = AuthScaffold(accent: LGColor.accentBlue) {
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

    @Test func settingsScaffoldInstantiates() {
        let toggle = Binding<Bool>(get: { true }, set: { _ in })
        let view = SettingsScaffold(
            sections: [
                SettingsScaffold.Section(title: "General", rows: [
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

    @Test func profileScaffoldInstantiates() {
        let view = ProfileScaffold(accent: LGColor.accentPink) {
            InitialsAvatarView(initials: "AB")
        } content: {
            Text("Body")
        }
        _ = view.body
    }

    @Test func listScaffoldPopulatedInstantiates() {
        let view = ListScaffold(
            items: [PreviewItem(id: 1), PreviewItem(id: 2)],
            accent: LGColor.accentBlue,
            onRefresh: {}
        ) { item in
            Text("Item \(item.id)")
        }
        #expect(view.items.count == 2)
        _ = view.body
    }

    @Test func listScaffoldEmptyInstantiates() {
        let view = ListScaffold(
            items: [PreviewItem](),
            emptyState: LGEmptyState(title: "Empty", systemImage: "tray")
        ) { item in
            Text("Item \(item.id)")
        }
        #expect(view.items.isEmpty)
        #expect(view.emptyState != nil)
        _ = view.body
    }
}

private struct PreviewItem: Identifiable {
    let id: Int
}

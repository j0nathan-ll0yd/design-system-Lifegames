import LifegamesComponents
import LifegamesComponentsCore
import LifegamesTokens
import SwiftUI

/// **Status:** Experimental
///
/// Brand-agnostic, data-model-driven settings shell. A *closed* row taxonomy
/// (navigation / toggle / value / destructive) is the right model for settings;
/// there is intentionally **no** `custom(AnyView)` escape hatch — a row that
/// doesn't fit belongs in a host-rendered sibling section, not erased into the
/// design system. All labels are host-owned `LocalizedStringKey`; the toggle
/// on-state and section accent use the injected `accent`
/// (default `LGColor.accentDefault`).
///
/// `Row` cannot be `Sendable` because `.toggle` carries a `Binding<Bool>`
/// (SwiftUI bindings are not `Sendable`); the host-supplied action closures are
/// `@Sendable`, which is the isolation boundary.
public struct SettingsScaffold: View {
    public struct Section: Identifiable {
        public let id: UUID
        public let title: LocalizedStringKey?
        public let footer: LocalizedStringKey?
        public let rows: [Row]

        public init(
            id: UUID = UUID(),
            title: LocalizedStringKey? = nil,
            footer: LocalizedStringKey? = nil,
            rows: [Row]
        ) {
            self.id = id
            self.title = title
            self.footer = footer
            self.rows = rows
        }
    }

    public enum Row {
        case navigation(label: LocalizedStringKey, systemImage: String, action: @Sendable () -> Void)
        case toggle(label: LocalizedStringKey, systemImage: String, isOn: Binding<Bool>)
        case value(label: LocalizedStringKey, systemImage: String, value: LocalizedStringKey)
        case destructive(label: LocalizedStringKey, systemImage: String, action: @Sendable () -> Void)
    }

    public let sections: [Section]
    public var accent: Color

    public init(sections: [Section], accent: Color = LGColor.accentDefault) {
        self.sections = sections
        self.accent = accent
    }

    public var body: some View {
        List {
            ForEach(sections) { section in
                SwiftUI.Section {
                    ForEach(Array(section.rows.enumerated()), id: \.offset) { _, row in
                        rowView(row)
                            .listRowBackground(LGColor.surfaceRaised)
                    }
                } header: {
                    if let title = section.title {
                        Text(title)
                    }
                } footer: {
                    if let footer = section.footer {
                        Text(footer)
                    }
                }
            }
        }
        .scrollContentBackground(.hidden)
        .background(LGColor.surfaceBase)
    }

    @ViewBuilder
    private func rowView(_ row: Row) -> some View {
        switch row {
        case let .navigation(label, systemImage, action):
            Button(action: action) {
                SettingRowView(systemImage: systemImage, label: label, accessory: .chevron)
            }
            .buttonStyle(.plain)

        case let .toggle(label, systemImage, isOn):
            Toggle(isOn: isOn) {
                rowLabel(label, systemImage: systemImage)
            }
            .tint(accent)
            .padding(.vertical, Spacing.s300)
            .padding(.horizontal, Spacing.s400)
            .frame(minHeight: 44)

        case let .value(label, systemImage, value):
            SettingRowView(systemImage: systemImage, label: label, accessory: .value(value))

        case let .destructive(label, systemImage, action):
            Button(role: .destructive, action: action) {
                rowLabel(label, systemImage: systemImage, tint: LGColor.accentRed)
            }
            .buttonStyle(.plain)
            .padding(.vertical, Spacing.s300)
            .padding(.horizontal, Spacing.s400)
            .frame(minHeight: 44)
            .contentShape(.rect)
        }
    }

    private func rowLabel(
        _ label: LocalizedStringKey,
        systemImage: String,
        tint: Color = LGColor.textPrimary
    ) -> some View {
        HStack(spacing: Spacing.s300) {
            Image(systemName: systemImage)
                .font(.system(size: 16))
                .foregroundStyle(tint == LGColor.textPrimary ? LGColor.textMuted : tint)
                .frame(width: 24)
            Text(label)
                .font(.system(size: 15))
                .foregroundStyle(tint)
            Spacer()
        }
    }
}

#Preview("Settings Scaffold") {
    SettingsPreviewHost()
        .preferredColorScheme(.dark)
}

private struct SettingsPreviewHost: View {
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

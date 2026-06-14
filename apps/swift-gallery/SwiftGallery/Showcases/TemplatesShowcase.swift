import LifegamesComponents
import LifegamesComponentsCore
import LifegamesTemplates
import LifegamesTokens
import SwiftUI

/// Showcases the brand-agnostic `LifegamesTemplates` scaffolds filled with
/// NEUTRAL mock content (no OMD types) — distinct from the OMD `Screens/`
/// exploration, which stays as the visual reference. Each scaffold is rendered
/// in a fixed-height frame so the four pure shells coexist in one scroll view.
struct TemplatesShowcase: View {
    @State private var cellular = true
    @State private var autoplay = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 32) {
                header

                section("AuthScaffold", "Launch / Login shell") {
                    AuthScaffold(
                        title: "Welcome",
                        subtitle: "Your library, ready offline.",
                        accent: LGColor.accentBlue
                    ) {
                        Image(systemName: "square.stack.3d.up.fill")
                            .font(.system(size: 48))
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
                    }
                }

                section("SettingsScaffold", "Closed-taxonomy settings") {
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

                section("ProfileScaffold", "Identity header + content") {
                    ProfileScaffold(accent: LGColor.accentPink) {
                        VStack(spacing: 12) {
                            LifegamesComponents.InitialsAvatarView(initials: "JL", accent: LGColor.accentPink, size: 72)
                            VStack(spacing: 4) {
                                Text("Jordan Lee")
                                    .font(.system(size: 18, weight: .bold, design: .rounded))
                                    .foregroundStyle(LGColor.textTitle)
                                Text("jordan@example.com")
                                    .font(.system(size: 13))
                                    .foregroundStyle(LGColor.textMuted)
                            }
                        }
                    } content: {
                        HStack(spacing: 12) {
                            MetricContentView(label: "Saved", value: "47", systemImage: "tray.fill", accent: LGColor.accentBlue)
                                .neonCard(accent: LGColor.accentBlue)
                            MetricContentView(label: "Storage", value: "2.4 GB", systemImage: "externaldrive.fill", accent: LGColor.accentAmber)
                                .neonCard(accent: LGColor.accentAmber)
                        }
                    }
                }

                section("ListScaffold", "Generic list + empty state") {
                    ListScaffold(
                        items: [
                            MockRow(id: 1, title: "First Item", icon: "doc.fill"),
                            MockRow(id: 2, title: "Second Item", icon: "doc.fill"),
                            MockRow(id: 3, title: "Third Item", icon: "doc.fill"),
                        ],
                        accent: LGColor.accentBlue,
                        emptyState: LGEmptyState(title: "Nothing Here", systemImage: "tray"),
                        onRefresh: {}
                    ) { item in
                        HStack(spacing: 12) {
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
            .padding(.horizontal, 20)
            .padding(.vertical, 24)
        }
        .gradientBackground()
        .navigationTitle("Templates")
        #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
        #endif
            .preferredColorScheme(.dark)
    }

    // MARK: - Header

    private var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("/// SCAFFOLDS")
                .font(.system(size: 9, weight: .bold, design: .monospaced))
                .kerning(2.5)
                .foregroundStyle(LGColor.accentCyan)
            Text("Templates")
                .font(.system(size: 32, weight: .bold))
                .foregroundStyle(LGColor.textTitle)
            Text("Brand-agnostic, slot-based screen scaffolds (Experimental). Filled here with neutral mock content — Part 2 fills them with app data.")
                .font(.system(size: 13))
                .foregroundStyle(LGColor.textMuted)
                .fixedSize(horizontal: false, vertical: true)
            Rectangle()
                .fill(LinearGradient(
                    colors: [LGColor.accentCyan, LGColor.accentBlue.opacity(0.0)],
                    startPoint: .leading,
                    endPoint: .trailing
                ))
                .frame(height: 2)
        }
    }

    private func section<Content: View>(
        _ title: String,
        _ subtitle: String,
        @ViewBuilder content: () -> Content
    ) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 15, weight: .semibold, design: .monospaced))
                    .foregroundStyle(LGColor.textTitle)
                Text(subtitle)
                    .font(.system(size: 11))
                    .foregroundStyle(LGColor.textMuted)
            }
            content()
                .frame(height: 360)
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(LGColor.cardGlassBorder, lineWidth: 1)
                )
        }
    }
}

private struct MockRow: Identifiable {
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

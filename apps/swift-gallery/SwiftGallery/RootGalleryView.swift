import LifegamesTokens
import SwiftUI

struct RootGalleryView: View {
    var body: some View {
        NavigationStack {
            List {
                galleryRow(
                    title: "Colors",
                    subtitle: "Backgrounds, text, accents, neon, health, glass",
                    icon: "swatchpalette.fill",
                    color: LGColor.accentPink,
                    destination: ColorsShowcase()
                )
                galleryRow(
                    title: "Typography",
                    subtitle: "Type scales and text styles",
                    icon: "textformat.size",
                    color: LGColor.accentPurple,
                    destination: TypographyShowcase()
                )
                galleryRow(
                    title: "Cards",
                    subtitle: "Card modifiers and surface styles",
                    icon: "rectangle.stack.fill",
                    color: LGColor.accentGreen,
                    destination: CardsShowcase()
                )
                galleryRow(
                    title: "Components",
                    subtitle: "HealthRing, StatItem, MetricCard, headers, banners",
                    icon: "square.grid.2x2.fill",
                    color: LGColor.accentDefault,
                    destination: ComponentsShowcase()
                )
                galleryRow(
                    title: "Neon Effects",
                    subtitle: "Glow, pulses, animated effects",
                    icon: "sparkles",
                    color: LGColor.accentBlue,
                    destination: NeonShowcase()
                )
                galleryRow(
                    title: "Widgets",
                    subtitle: "DS widgets and health panel showcase",
                    icon: "rectangle.3.group.fill",
                    color: LGColor.accentPurple,
                    destination: DSWidgetsShowcase()
                )
            }
            .listStyle(.plain)
            .scrollContentBackground(.hidden)
            .gradientBackground()
            .navigationTitle("Design Gallery")
            #if os(iOS)
                .navigationBarTitleDisplayMode(.large)
            #endif
        }
        .preferredColorScheme(.dark)
    }

    private func galleryRow<D: View>(
        title: String,
        subtitle: String,
        icon: String,
        color: Color,
        destination: D
    ) -> some View {
        NavigationLink {
            destination
        } label: {
            HStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.system(size: 14))
                    .foregroundStyle(color)
                    .frame(width: 36, height: 36)
                    .background(color.opacity(0.15))
                    .clipShape(Circle())
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.system(size: 13, weight: .semibold, design: .monospaced))
                        .foregroundStyle(LGColor.textPrimary)
                    Text(subtitle)
                        .font(.system(size: 10))
                        .foregroundStyle(LGColor.textMuted)
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(LGColor.textSubtle)
            }
            .padding(.vertical, 6)
        }
        .listRowBackground(Color.clear)
        .listRowSeparatorTint(LGColor.cardGlassBorder)
    }
}

#Preview("Root Gallery") {
    RootGalleryView()
        .preferredColorScheme(.dark)
}

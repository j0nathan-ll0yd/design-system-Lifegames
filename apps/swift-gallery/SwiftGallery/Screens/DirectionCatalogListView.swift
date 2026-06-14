import LifegamesTokens
import SwiftUI

private struct DirectionMeta: Identifiable {
    let id: String
    let label: String
    let subtitle: String
    let accentColor: Color
    let systemImage: String
}

private let directions: [DirectionMeta] = [
    DirectionMeta(
        id: "neon-console",
        label: "Neon Console",
        subtitle: "Neon-dense, glow-centric, card grids",
        accentColor: LGColor.accentBlue,
        systemImage: "waveform.path.ecg"
    ),
]

struct DirectionCatalogListView: View {
    var body: some View {
        List(directions) { direction in
            NavigationLink(destination: DirectionDetailView(directionId: direction.id)) {
                HStack(spacing: Spacing.s300) {
                    Image(systemName: direction.systemImage)
                        .font(.system(size: 20))
                        .foregroundStyle(direction.accentColor)
                        .frame(width: 32)

                    VStack(alignment: .leading, spacing: Spacing.s50) {
                        Text(direction.label)
                            .font(OMDFont.semibold(16))
                            .foregroundStyle(LGColor.textTitle)

                        Text(direction.subtitle)
                            .font(OMDFont.regular(12))
                            .foregroundStyle(LGColor.textMuted)
                    }
                }
                .padding(.vertical, Spacing.s100)
            }
        }
        .listStyle(.plain)
        .background(LGColor.surfaceBase)
    }
}

#Preview("Direction Catalog List") {
    NavigationStack {
        DirectionCatalogListView()
            .navigationTitle("By Direction")
        #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
        #endif
    }
    .preferredColorScheme(.dark)
}

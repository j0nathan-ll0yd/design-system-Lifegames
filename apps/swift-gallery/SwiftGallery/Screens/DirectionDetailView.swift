import LifegamesTokens
import SwiftUI

struct DirectionDetailView: View {
    let directionId: String

    private var directionLabel: String {
        switch directionId {
        case "neon-console": return "A — Neon Console"
        case "editorial-calm": return "B — Editorial Calm"
        case "utility-dense": return "C — Utility Dense"
        default: return directionId
        }
    }

    var body: some View {
        ScrollView {
            if ScreenCatalog.all.isEmpty {
                ContentUnavailableView(
                    "No Screens Yet",
                    systemImage: "rectangle.on.rectangle.angled",
                    description: Text("Screen workers are building the catalog.")
                )
                .foregroundStyle(LGColor.textMuted)
                .padding(.top, Spacing.s1600)
            } else {
                VStack(alignment: .leading, spacing: Spacing.s600) {
                    ForEach(ScreenCatalog.all) { entry in
                        if let direction = entry.directions.first(where: { $0.id == directionId }) {
                            VStack(alignment: .leading, spacing: Spacing.s200) {
                                Text(entry.title.uppercased())
                                    .font(.system(size: 10, weight: .bold, design: .monospaced))
                                    .kerning(1.2)
                                    .foregroundStyle(LGColor.textSubtle)
                                    .padding(.horizontal, Spacing.s400)

                                direction.make()
                                    .padding(Spacing.s300)
                                    .background(
                                        LGColor.surfaceRaised.opacity(0.4),
                                        in: RoundedRectangle(cornerRadius: 12)
                                    )
                                    .padding(.horizontal, Spacing.s400)
                            }
                        }
                    }
                }
                .padding(.vertical, Spacing.s400)
            }
        }
        .background(LGColor.surfaceBase)
        .navigationTitle(directionLabel)
        #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
        #endif
    }
}

#Preview("Direction Detail — Neon Console") {
    NavigationStack {
        DirectionDetailView(directionId: "neon-console")
    }
    .preferredColorScheme(.dark)
}

#Preview("Direction Detail — Editorial Calm") {
    NavigationStack {
        DirectionDetailView(directionId: "editorial-calm")
    }
    .preferredColorScheme(.dark)
}

#Preview("Direction Detail — Utility Dense") {
    NavigationStack {
        DirectionDetailView(directionId: "utility-dense")
    }
    .preferredColorScheme(.dark)
}

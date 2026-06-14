import LifegamesTokens
import SwiftUI

struct ScreenDetailView: View {
    let entry: ScreenEntry

    var body: some View {
        if entry.directions.count == 1, let only = entry.directions.first {
            // Single direction: render the screen full-viewport, exactly as it
            // appears in the app. The screen view owns its own scroll, background,
            // and navigation chrome — no gallery card wrapper.
            only.make()
        } else {
            comparisonStack
        }
    }

    /// Multi-direction comparison: each rendering sits in a labeled, inset card so
    /// directions can be browsed side by side. Used only when >1 direction exists.
    private var comparisonStack: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Spacing.s600) {
                ForEach(entry.directions) { direction in
                    VStack(alignment: .leading, spacing: Spacing.s200) {
                        Text(direction.label.uppercased())
                            .font(OMDFont.bold(10))
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
            .padding(.vertical, Spacing.s400)
        }
        .background(LGColor.surfaceBase)
        .navigationTitle(entry.title)
        #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
        #endif
    }
}

#Preview("Screen Detail — Empty") {
    NavigationStack {
        ScreenDetailView(
            entry: ScreenEntry(
                id: "placeholder",
                title: "Preview Placeholder",
                directions: []
            )
        )
    }
    .preferredColorScheme(.dark)
}

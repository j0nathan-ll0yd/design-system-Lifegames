import LifegamesTokens
import SwiftUI

struct ScreenDetailView: View {
    let entry: ScreenEntry

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Spacing.s600) {
                ForEach(entry.directions) { direction in
                    VStack(alignment: .leading, spacing: Spacing.s200) {
                        Text(direction.label.uppercased())
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

import LifegamesTokens
import SwiftUI

struct WidgetDetailView: View {
    let entry: WidgetEntry

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                ForEach(entry.canonicallyOrderedStates) { state in
                    VStack(alignment: .leading, spacing: 8) {
                        Text(state.label.uppercased())
                            .font(.system(size: 10, weight: .bold, design: .monospaced))
                            .kerning(1.2)
                            .foregroundStyle(LGColor.textSubtle)
                        state.make()
                            .padding(12)
                            .background(
                                LGColor.surfaceRaised.opacity(0.4),
                                in: RoundedRectangle(cornerRadius: 12)
                            )
                    }
                }
            }
            .padding(16)
        }
        .background(LGColor.surfaceBase)
        .navigationTitle(entry.title)
        #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
        #endif
    }
}

#Preview("Widget Detail — Heart Rate") {
    NavigationStack {
        WidgetDetailView(entry: HeartRateVariations.entry)
    }
    .preferredColorScheme(.dark)
}

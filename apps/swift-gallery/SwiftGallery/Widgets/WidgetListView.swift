import LifegamesTokens
import SwiftUI

struct WidgetListView: View {
    let category: WidgetCategory

    private var entries: [WidgetEntry] {
        WidgetCatalog.entries(in: category).sorted {
            $0.title.localizedCaseInsensitiveCompare($1.title) == .orderedAscending
        }
    }

    var body: some View {
        List {
            ForEach(entries) { entry in
                NavigationLink {
                    WidgetDetailView(entry: entry)
                } label: {
                    WidgetRow(entry: entry)
                }
                .listRowBackground(Color.clear)
                .listRowSeparatorTint(LGColor.cardGlassBorder)
            }
        }
        .listStyle(.plain)
        .scrollContentBackground(.hidden)
        .gradientBackground()
        .navigationTitle(category.title)
        #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
        #endif
    }
}

private struct WidgetRow: View {
    let entry: WidgetEntry

    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text(entry.title)
                    .font(.system(size: 13, weight: .semibold, design: .monospaced))
                    .foregroundStyle(LGColor.textPrimary)
                Text("\(entry.states.count) states")
                    .font(.system(size: 10))
                    .foregroundStyle(LGColor.textMuted)
            }
            Spacer()
        }
        .padding(.vertical, 6)
    }
}

#Preview("Widget List — Health") {
    NavigationStack {
        WidgetListView(category: .health)
    }
    .preferredColorScheme(.dark)
}

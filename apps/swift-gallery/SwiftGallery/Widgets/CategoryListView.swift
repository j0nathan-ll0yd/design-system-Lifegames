import LifegamesTokens
import SwiftUI

struct CategoryListView: View {
    var body: some View {
        List {
            ForEach(WidgetCatalog.populatedCategories) { category in
                NavigationLink {
                    WidgetListView(category: category)
                } label: {
                    CategoryRow(category: category)
                }
                .listRowBackground(Color.clear)
                .listRowSeparatorTint(LGColor.cardGlassBorder)
            }
        }
        .listStyle(.plain)
        .scrollContentBackground(.hidden)
        .gradientBackground()
        .navigationTitle("Widgets")
        #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
        #endif
    }
}

private struct CategoryRow: View {
    let category: WidgetCategory

    private var widgetCount: Int {
        WidgetCatalog.entries(in: category).count
    }

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: category.iconName)
                .font(.system(size: 14))
                .foregroundStyle(LGColor.accentPink)
                .frame(width: 36, height: 36)
                .background(LGColor.accentPink.opacity(0.15))
                .clipShape(Circle())
            VStack(alignment: .leading, spacing: 2) {
                Text(category.title)
                    .font(.system(size: 13, weight: .semibold, design: .monospaced))
                    .foregroundStyle(LGColor.textPrimary)
                Text(category.subtitle)
                    .font(.system(size: 10))
                    .foregroundStyle(LGColor.textMuted)
            }
            Spacer()
            Text("\(widgetCount)")
                .font(.system(size: 11, weight: .semibold, design: .monospaced))
                .foregroundStyle(LGColor.textSubtle)
        }
        .padding(.vertical, 6)
    }
}

#Preview("Category List") {
    NavigationStack {
        CategoryListView()
    }
    .preferredColorScheme(.dark)
}

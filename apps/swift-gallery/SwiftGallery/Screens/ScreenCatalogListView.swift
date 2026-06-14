import LifegamesTokens
import SwiftUI

// MARK: - ScreenBrowseView

// Entry view wired into RootGalleryView. Only the Neon Console direction
// survives, so the browse mode picker is gone — the screen catalog renders
// directly.

struct ScreenBrowseView: View {
    var body: some View {
        ScreenCatalogListView()
            .background(LGColor.surfaceBase)
            .navigationTitle("Screens")
        #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
        #endif
    }
}

// MARK: - ScreenCatalogListView

struct ScreenCatalogListView: View {
    var body: some View {
        List(ScreenCatalog.all) { entry in
            NavigationLink(destination: ScreenDetailView(entry: entry)) {
                VStack(alignment: .leading, spacing: Spacing.s50) {
                    Text(entry.title)
                        .font(OMDFont.semibold(16))
                        .foregroundStyle(LGColor.textTitle)

                    Text(entry.directions.map(\.label).joined(separator: ", "))
                        .font(OMDFont.regular(12))
                        .foregroundStyle(LGColor.textMuted)
                }
                .padding(.vertical, Spacing.s100)
            }
        }
        .listStyle(.plain)
        .background(LGColor.surfaceBase)
        .overlay {
            if ScreenCatalog.all.isEmpty {
                ContentUnavailableView(
                    "No Screens Yet",
                    systemImage: "rectangle.on.rectangle.angled",
                    description: Text("Screen workers are building the catalog.")
                )
                .foregroundStyle(LGColor.textMuted)
            }
        }
    }
}

#Preview("Screen Browse View") {
    NavigationStack {
        ScreenBrowseView()
    }
    .preferredColorScheme(.dark)
}

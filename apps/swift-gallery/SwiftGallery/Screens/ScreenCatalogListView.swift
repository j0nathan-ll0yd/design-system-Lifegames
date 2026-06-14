import LifegamesTokens
import SwiftUI

// MARK: - ScreenBrowseView

// Entry view wired into RootGalleryView by T6. Segmented picker toggles By Screen / By Direction.

struct ScreenBrowseView: View {
    @State private var selection = 0

    var body: some View {
        VStack(spacing: 0) {
            Picker("Browse Mode", selection: $selection) {
                Text("By Screen").tag(0)
                Text("By Direction").tag(1)
            }
            .pickerStyle(.segmented)
            .padding(Spacing.s400)
            .background(LGColor.surfaceBase)

            if selection == 0 {
                ScreenCatalogListView()
            } else {
                DirectionCatalogListView()
            }
        }
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
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(LGColor.textTitle)

                    Text(entry.directions.map(\.label).joined(separator: ", "))
                        .font(.system(size: 12))
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

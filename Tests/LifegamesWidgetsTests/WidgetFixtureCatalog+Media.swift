import Foundation
@testable import LifegamesWidgets

extension WidgetFixtureCatalogTests {
    static var mediaRows: [FixtureCatalogRow] {
        [
            // Data-only fixture pool for OMD app previews (S98) — direct Codable decode
            // against the public MediaFixtureModels wire types; no widget view exists.
            .row(MediaFileProps.self, category: "media", name: "media-file.downloaded"),
            .row(MediaFileProps.self, category: "media", name: "media-file.pending"),
            .row(MediaFileProps.self, category: "media", name: "media-file.long-metadata"),
            .row(MediaLibraryProps.self, category: "media", name: "media-library.empty"),
            .row(MediaLibraryProps.self, category: "media", name: "media-library.populated-min"),
            .row(MediaLibraryProps.self, category: "media", name: "media-library.populated-max"),
            .row(MediaProfileProps.self, category: "media", name: "media-profile.standard"),
            .row(MediaProfileProps.self, category: "media", name: "media-profile.new-user"),
        ]
    }
}

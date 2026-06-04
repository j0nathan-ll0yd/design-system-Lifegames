import Foundation
@testable import LifegamesWidgets

extension WidgetFixtureCatalogTests {
    static var otherRows: [FixtureCatalogRow] {
        dndOverlayRows + focusOverlayRows + gitHubHeatmapRows + ogImageRows + systemStatusRows
    }

    // MARK: - DndOverlay (adapter-required: all fixtures are {}, adapter returns default Props)

    private static var dndOverlayRows: [FixtureCatalogRow] {
        [
            dndOverlayRow("dnd-overlay"),
            dndOverlayRow("dnd-overlay.populated-min"),
            dndOverlayRow("dnd-overlay.populated-max"),
            dndOverlayRow("dnd-overlay.default"),
            dndOverlayRow("dnd-overlay.skeleton"),
            dndOverlayRow("dnd-overlay.empty"),
        ]
    }

    private static func dndOverlayRow(_ name: String) -> FixtureCatalogRow {
        .adapted(
            category: "other",
            name: name,
            propsTypeName: "DndOverlayProps",
            adapt: { Adapters.dndOverlay(fromFixture: $0) }
        )
    }

    // MARK: - FocusOverlay (adapter-required: all fixtures are {}, adapter returns default Props)

    private static var focusOverlayRows: [FixtureCatalogRow] {
        [
            focusOverlayRow("focus-overlay"),
            focusOverlayRow("focus-overlay.populated-min"),
            focusOverlayRow("focus-overlay.populated-max"),
            focusOverlayRow("focus-overlay.default"),
            focusOverlayRow("focus-overlay.skeleton"),
            focusOverlayRow("focus-overlay.empty"),
        ]
    }

    private static func focusOverlayRow(_ name: String) -> FixtureCatalogRow {
        .adapted(
            category: "other",
            name: name,
            propsTypeName: "FocusOverlayProps",
            adapt: { Adapters.focusOverlay(fromFixture: $0) }
        )
    }

    // MARK: - GitHubHeatmap (adapter-required: wire shape has github envelope)

    private static var gitHubHeatmapRows: [FixtureCatalogRow] {
        [
            gitHubHeatmapRow("github-heatmap"),
            gitHubHeatmapRow("github-heatmap.populated-min"),
            gitHubHeatmapRow("github-heatmap.populated-max"),
            gitHubHeatmapRow("github-heatmap.burst-driven"),
            gitHubHeatmapRow("github-heatmap.consistent-contributor"),
            gitHubHeatmapRow("github-heatmap.seasonal-surge"),
            gitHubHeatmapRow("github-heatmap.sparse-year"),
            gitHubHeatmapRow("github-heatmap.weekend-warrior"),
            gitHubHeatmapRow("github-heatmap.skeleton"),
            gitHubHeatmapRow("github-heatmap.empty"),
        ]
    }

    private static func gitHubHeatmapRow(_ name: String) -> FixtureCatalogRow {
        .adapted(
            category: "other",
            name: name,
            propsTypeName: "GitHubHeatmapProps",
            adapt: { Adapters.gitHubHeatmap(fromFixture: $0) }
        )
    }

    // MARK: - OGImage (adapter wraps JSONDecoder; wire includes avatarUrl not in Props)

    private static var ogImageRows: [FixtureCatalogRow] {
        [
            ogImageRow("og-image"),
        ]
    }

    private static func ogImageRow(_ name: String) -> FixtureCatalogRow {
        .adapted(
            category: "other",
            name: name,
            propsTypeName: "OGImageProps",
            adapt: { Adapters.ogImage(fromFixture: $0) }
        )
    }

    // MARK: - SystemStatus (adapter-required: wire uses dotClass, Props uses status)

    private static var systemStatusRows: [FixtureCatalogRow] {
        [
            systemStatusRow("system-status"),
            systemStatusRow("system-status.populated-min"),
            systemStatusRow("system-status.populated-max"),
            systemStatusRow("system-status.all-green"),
            systemStatusRow("system-status.bootstrap"),
            systemStatusRow("system-status.degraded"),
            systemStatusRow("system-status.mixed"),
            systemStatusRow("system-status.one-stale"),
            systemStatusRow("system-status.skeleton"),
            systemStatusRow("system-status.empty"),
        ]
    }

    private static func systemStatusRow(_ name: String) -> FixtureCatalogRow {
        .adapted(
            category: "other",
            name: name,
            propsTypeName: "SystemStatusProps",
            adapt: { Adapters.systemStatus(fromFixture: $0) }
        )
    }
}

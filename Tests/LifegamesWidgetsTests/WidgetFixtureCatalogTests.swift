import Foundation
import Testing
@testable import LifegamesWidgets

/// CI-enforced fixture catalog test. Mirrors the gallery's `*Variations.swift` entries: every
/// `(category, name)` pair referenced by a `Kind.fixture(name)` case must round-trip through
/// `WidgetFixtures.data(...)` and `JSONDecoder().decode(PropsType.self, ...)`.
///
/// Skeleton/empty entries that use `Kind.skeleton` or `Kind.empty` are excluded — they call
/// `init(state:)` and never load JSON, so their `.skeleton.json` / `.empty.json` fixtures (which
/// do exist on disk) are not validated here.
///
/// Per-category rows live in `WidgetFixtureCatalog+<Category>.swift`. When a new widget is added
/// to a category, the only file the author touches is that category's extension — no shared file
/// changes, so parallel category workers don't conflict.
@Suite("Widget Fixture Catalog — every cataloged fixture loads and decodes")
struct WidgetFixtureCatalogTests {
    /// Catalog of every fixture the gallery loads through `FixtureLoader`.
    static var allRows: [FixtureCatalogRow] {
        healthRows + identityRows + locationRows + readingRows + otherRows + githubRows
    }

    @Test func catalogIsNonEmpty() {
        #expect(
            !Self.allRows.isEmpty,
            "Fixture catalog is empty — at least one widget must be registered"
        )
    }

    @Test func everyCatalogedFixtureLoads() {
        for row in Self.allRows {
            let data = WidgetFixtures.data(category: row.category, name: row.name)
            #expect(
                data != nil,
                "Missing fixture: \(row.category)/\(row.name).json (declared as \(row.propsTypeName))"
            )
        }
    }

    @Test func everyCatalogedFixtureDecodes() throws {
        for row in Self.allRows {
            guard let data = WidgetFixtures.data(category: row.category, name: row.name) else {
                continue // already reported by everyCatalogedFixtureLoads
            }
            do {
                try row.decode(data)
            } catch {
                Issue.record("Decode failed: \(row.category)/\(row.name).json → \(row.propsTypeName): \(error)")
            }
        }
    }
}

/// One row in the fixture catalog. `decode` is a closure (rather than a generic param) so all
/// rows can live in the same array regardless of their Props type.
struct FixtureCatalogRow {
    let category: String
    let name: String
    let propsTypeName: String
    let decode: (Data) throws -> Void

    /// Direct Codable decode — for fixtures whose wire shape matches the Props type.
    static func row<T: Decodable>(
        _ propsType: T.Type,
        category: String,
        name: String
    ) -> FixtureCatalogRow {
        FixtureCatalogRow(
            category: category,
            name: name,
            propsTypeName: String(describing: T.self),
            decode: { data in _ = try JSONDecoder().decode(T.self, from: data) }
        )
    }

    /// Adapter-required fixture — call the per-widget adapter, fail if it returns nil. Use for
    /// wire-format fixtures (Health, Identity, Bio, …) that don't decode directly to Props.
    static func adapted(
        category: String,
        name: String,
        propsTypeName: String,
        adapt: @escaping (Data) -> Any?
    ) -> FixtureCatalogRow {
        FixtureCatalogRow(
            category: category,
            name: name,
            propsTypeName: propsTypeName,
            decode: { data in
                if adapt(data) == nil {
                    throw AdapterFailure(message: "adapter returned nil for \(category)/\(name)")
                }
            }
        )
    }
}

struct AdapterFailure: Error {
    let message: String
}

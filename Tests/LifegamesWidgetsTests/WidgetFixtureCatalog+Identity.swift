import Foundation
@testable import LifegamesWidgets

extension WidgetFixtureCatalogTests {
    static var identityRows: [FixtureCatalogRow] {
        // BioTerminal — envelope-wrapped wire format, adapter required.
        // skeleton/empty fixtures have {profile: {terminalLines: []}} and decode fine through adapter.
        bioTerminalRows
            + comingSoonRows
            + identityCardRows
    }

    private static var bioTerminalRows: [FixtureCatalogRow] {
        [
            "bio-terminal",
            "bio-terminal.populated-min",
            "bio-terminal.populated-max",
            "bio-terminal.dense",
            "bio-terminal.minimal",
            "bio-terminal.skills",
            "bio-terminal.uptime",
            "bio-terminal.skeleton",
            "bio-terminal.empty",
        ].map { name in
            .adapted(
                category: "identity",
                name: name,
                propsTypeName: "BioTerminalProps",
                adapt: { Adapters.bioTerminal(fromFixture: $0) }
            )
        }
    }

    // ComingSoon — all current fixtures are `{}` placeholders; adapter returns placeholder Props.
    private static var comingSoonRows: [FixtureCatalogRow] {
        [
            "coming-soon",
            "coming-soon.populated-min",
            "coming-soon.populated-max",
            "coming-soon.variation-a",
            "coming-soon.variation-b",
            "coming-soon.variation-c",
            "coming-soon.skeleton",
            "coming-soon.empty",
        ].map { name in
            .adapted(
                category: "identity",
                name: name,
                propsTypeName: "ComingSoonProps",
                adapt: { Adapters.comingSoon(fromFixture: $0) }
            )
        }
    }

    // IdentityCard — envelope-wrapped, github/linkedin key rename, tagline optional.
    private static var identityCardRows: [FixtureCatalogRow] {
        [
            "identity-card",
            "identity-card.populated-min",
            "identity-card.populated-max",
            "identity-card.creator",
            "identity-card.engineer-lead",
            "identity-card.long-bio",
            "identity-card.minimal",
            "identity-card.skeleton",
            "identity-card.empty",
        ].map { name in
            .adapted(
                category: "identity",
                name: name,
                propsTypeName: "IdentityCardProps",
                adapt: { Adapters.identityCard(fromFixture: $0) }
            )
        }
    }
}

import CoreText
import LifegamesCopy
import LifegamesTokens
import SwiftUI
import Testing
import ViewInspector
@testable import LifegamesComponentsCore

/// Behavioral (non-screenshot) proof that each Coffee label renders in its designed Space
/// Grotesk face. A `.fontWeight` on a name-resolved custom face logged "Unable to update Font
/// Descriptor's weight" on device and rendered Regular; each label now reads an emphasized token,
/// and this suite resolves the font the view actually carries.
@Suite("Coffee labels — resolved typography")
@MainActor
struct CoffeeTypographyBehaviorTests {
    private static let coffee = CopyLoader.widgets.coffee

    /// PostScript face of the font the `Text` whose string starts with `prefix` carries.
    private static func face(of prefix: String, in view: some View) throws -> String {
        guard #available(iOS 26, macOS 26, watchOS 26, *) else {
            Issue.record("Font.resolve(in:) needs iOS 26 / macOS 26; this host cannot prove the faces")
            return ""
        }
        LifegamesFonts.registerFonts()
        let text = try view.inspect().find(ViewType.Text.self, where: { try $0.string().hasPrefix(prefix) })
        let font = try text.attributes().font()
        let resolved = font.resolve(in: EnvironmentValues().fontResolutionContext)
        return CTFontCopyPostScriptName(resolved.ctFont) as String
    }

    @Test(arguments: [
        CoffeeTrackingProps.ScaleConnection.unpaired, .searching, .connected, .error,
    ])
    func badgePillStatusIsMedium(connection: CoffeeTrackingProps.ScaleConnection) throws {
        let badge = CoffeeConnectionBadge(connection: connection, mode: .pill)
        #expect(try Self.face(of: badge.statusLabel, in: badge) == "SpaceGrotesk-Medium")
    }

    /// Connected, cup lifted: "Sipping…" shows and the primary action is Finish Cup.
    @Test func sippingStateFaces() throws {
        let props = CoffeeTrackingProps(
            connection: .connected, isSessionActive: true, isCupOnScale: false,
            startWeightGrams: 300, lastStableWeightGrams: 150
        )
        #expect(props.isSipping)
        let view = CoffeeTrackingView(props: props, animated: false)
        #expect(try Self.face(of: Self.coffee.sipping, in: view) == "SpaceGrotesk-Medium")
        #expect(try Self.face(of: Self.coffee.dailyLabel, in: view) == "SpaceGrotesk-Medium")
        #expect(try Self.face(of: Self.coffee.actionFinishCup, in: view) == "SpaceGrotesk-SemiBold")
    }

    /// Connected with a cup on the scale: the "this cup" caption stays Regular.
    @Test func connectedWithCupFaces() throws {
        let props = CoffeeTrackingProps(
            connection: .connected, isSessionActive: true, isCupOnScale: true,
            startWeightGrams: 300, lastStableWeightGrams: 150
        )
        let view = CoffeeTrackingView(props: props, animated: false)
        let thisCup = try #require(Self.coffee.thisCup.components(separatedBy: "{beverage}").first)
        #expect(!thisCup.isEmpty)
        #expect(try Self.face(of: thisCup, in: view) == "SpaceGrotesk-Regular")
        #expect(try Self.face(of: Self.coffee.actionFinishCup, in: view) == "SpaceGrotesk-SemiBold")
    }

    /// Link lost with a cup tracked: the secondary Reconnect title is Medium.
    @Test func linkLostReconnectIsMedium() throws {
        let props = CoffeeTrackingProps(
            connection: .error, isSessionActive: true, isCupOnScale: true,
            startWeightGrams: 300, lastStableWeightGrams: 150
        )
        let view = CoffeeTrackingView(props: props, animated: false, onReconnect: {})
        #expect(view.showsReconnectAffordance)
        #expect(try Self.face(of: Self.coffee.actionReconnect, in: view) == "SpaceGrotesk-Medium")
    }
}

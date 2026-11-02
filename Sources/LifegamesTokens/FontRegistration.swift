import CoreText
import os
import SwiftUI

@MainActor
public enum LifegamesFonts {
    /// One static face per weight in `SWIFT_FONT_WEIGHT` (style-dictionary.config.mjs). iOS resolves
    /// `Font.custom` by PostScript name, and a variable font's named instances do not resolve by
    /// name, so each face `Font.Tokens` names ships as its own file
    /// (scripts/fonts/instance-space-grotesk.py).
    static let faces = [
        "SpaceGrotesk-Light",
        "SpaceGrotesk-Regular",
        "SpaceGrotesk-Medium",
        "SpaceGrotesk-SemiBold",
        "SpaceGrotesk-Bold",
    ]

    private static var registered = false
    private static let logger = Logger(subsystem: "com.lifegames.design-system", category: "fonts")

    public static func registerFonts() {
        guard !registered else { return }
        registered = true
        for face in faces {
            // `.process("Resources")` flattens Resources/Fonts/ into the bundle root.
            guard let url = Bundle.module.url(forResource: face, withExtension: "ttf") else {
                logger.error("\(face, privacy: .public).ttf is missing from the LifegamesTokens bundle; its tokens fall back to the system font")
                continue
            }
            var error: Unmanaged<CFError>?
            guard !CTFontManagerRegisterFontsForURL(url as CFURL, .process, &error),
                  let cfError = error?.takeRetainedValue(),
                  CFErrorGetCode(cfError) != CTFontManagerError.alreadyRegistered.rawValue
            else { continue }
            logger.error("\(face, privacy: .public) failed to register: \(cfError.localizedDescription, privacy: .public)")
        }
    }
}

import CoreText
import SwiftUI

@MainActor
public enum LifegamesFonts {
    private static var registered = false

    public static func registerFonts() {
        guard !registered else { return }
        registered = true
        let fonts = ["SpaceGrotesk-Variable"]
        for font in fonts {
            guard let url = Bundle.module.url(forResource: font, withExtension: "ttf", subdirectory: "Fonts") else { continue }
            CTFontManagerRegisterFontsForURL(url as CFURL, .process, nil)
        }
    }
}

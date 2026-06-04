import LifegamesTokens
import SwiftUI

@main
struct SwiftGalleryApp: App {
    init() {
        LifegamesFonts.registerFonts()
    }

    var body: some Scene {
        WindowGroup {
            RootGalleryView()
                .preferredColorScheme(.dark)
        }
    }
}

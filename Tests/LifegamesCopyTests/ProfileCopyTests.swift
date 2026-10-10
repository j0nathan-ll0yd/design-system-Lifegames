import Foundation
import Testing
import LifegamesCopy

@Suite("Profile copy")
struct ProfileCopyTests {
    @Test("Bundled profile decodes: a tagline and five terminal blocks")
    func loadsBundledProfile() throws {
        let profile = try CopyLoader.loadProfile()

        #expect(!profile.tagline.isEmpty)
        let blocks = [
            profile.terminal.gpg, profile.terminal.stack, profile.terminal.uptime,
            profile.terminal.philosophy, profile.terminal.interests,
        ]
        for block in blocks {
            // Each block is a prompt line followed by at least one output line.
            #expect(block.first?.hasPrefix("$ ") == true)
            #expect(block.count >= 2)
            #expect(block.dropFirst().allSatisfy { $0.hasPrefix("→ ") })
        }
    }
}

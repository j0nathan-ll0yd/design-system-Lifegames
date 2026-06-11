import Foundation
import Testing
import LifegamesCopy

@Suite("Identity copy")
struct IdentityCopyTests {
    @Test("Bundled identity decodes and required string fields are non-empty")
    func loadsBundledIdentity() throws {
        let identity = try CopyLoader.loadIdentity()

        #expect(!identity.person.name.isEmpty)
        #expect(!identity.person.firstName.isEmpty)
        #expect(!identity.person.lastName.isEmpty)
        #expect(!identity.person.jobTitle.isEmpty)
        #expect(!identity.person.location.isEmpty)
        #expect(!identity.person.yearsExperience.isEmpty)
        #expect(!identity.person.philosophy.isEmpty)
        #expect(!identity.person.shortBio.isEmpty)
        #expect(!identity.person.socialBio.isEmpty)
        #expect(!identity.person.longBio.isEmpty)
        #expect(!identity.person.flavorBio.isEmpty)

        #expect(!identity.site.name.isEmpty)
        #expect(!identity.site.fullName.isEmpty)
        #expect(!identity.site.tagline.isEmpty)
        #expect(!identity.site.description.isEmpty)

        #expect(!identity.seo.title.isEmpty)
        #expect(!identity.a11Y.skipToMain.isEmpty)
        #expect(!identity.a11Y.ogImageAlt.isEmpty)
    }

    @Test("List fields are non-empty and expertise is the unified list")
    func listFieldsArePopulated() throws {
        let identity = try CopyLoader.loadIdentity()

        #expect(!identity.person.skills.isEmpty)
        #expect(!identity.person.interests.isEmpty)
        #expect(!identity.seo.keywords.isEmpty)
        #expect(!identity.seo.expertise.isEmpty)

        // seo.expertise is the single home unifying web Person.knowsAbout and
        // backend EXPERTISE — assert a known member to guard against regressions.
        #expect(identity.seo.expertise.contains("Backend Engineering"))
    }
}

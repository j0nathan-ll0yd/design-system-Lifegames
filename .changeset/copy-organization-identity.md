---
'@j0nathan-ll0yd/copy': minor
---

New `identity.organization` group: the facts for a schema.org `Organization` node for Lifegames in the website JSON-LD (owner decision 2026-10-24). The keys are `name`, `description`, `contactType`, `contactEmail`, `poBox`, `locality`, `region`, `postalCode`, and `country`. The website maps them into the node `name`, `description`, `email`, `contactPoint`, and a `PostalAddress` with `postOfficeBoxNumber` and no `streetAddress`. There is no `url` key: the node url is the site URL constant, because the mail domain does not resolve.

`contactEmail` is a purpose-made, revocable alias for the Organization contact point. It is not the personal address, which stays obfuscated on `/contact` (owner ruling 2026-10-12). The agent-readiness tests hold the alias unequal to `person.email` and allow no other identity leaf to name it. `contactType` equals `person.contactType`, and a test holds the two equal. The PO Box is the business mailing address; the Person address stays locality-only.

Additive, hence minor, as for the `identity.navigation` group in 4.1.0. Swift gains `public struct IdentityOrganization` and an `Identity.organization` property, so the memberwise `Identity.init` takes one more argument. No Swift code calls it; `CopyLoader` decodes the bundled JSON.

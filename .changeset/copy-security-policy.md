---
'@j0nathan-ll0yd/copy': minor
---

Add a security contact and a vulnerability-disclosure policy for `/contact` (atlas decision 0175, owner rulings 2026-10-29 and 2026-10-30).

- `identity.person.securityEmail`: the security contact address, `security@lifegames.org`. `/.well-known/security.txt` publishes it as its first Contact line. `person.email` stays as the second. Locale-invariant.
- Eleven `identity.contact` policy leaves, in render order: `securityScope`, `securityReport`, `securityReportAlternate`, `securityEncryption`, `securityInclude`, `securitySafeHarbor`, `securityThirdParty`, `securityExclusions`, `securityBounty`, `securityResponse`, and `securityDisclosure`. They state the scope, both addresses, the OpenPGP key for reports to the security address, and what a report carries. They give the safe harbor and its limits: it covers the site's own code and configuration, not the platforms of third-party providers such as Cloudflare or Proton, and it has four exclusions. The data rule permits no more data than the issue needs. They state no bounty, a first reply within 7 days, and a 90-day window, counted from the report, before public disclosure. `securityScope` and `securityEncryption` are ICU templates whose only placeholder is `{siteUrl}`: they are the first identity leaves a consumer must fill before it renders them. Each address sits whole in its own leaf, so the website can encode it.
- `identity.contact.security` is deprecated in favor of `identity.contact.securityReport`. Its value does not change and still names `person.email` only. A website on this version that still renders it publishes no new address. The TS type gains an `@deprecated` JSDoc, the Zod schema a `.describe()`, and the Swift `IdentityContact.security` property a doc comment. The key stays until the next major release.
- `identity.contact.metaDescription` no longer says that security reports go to the same address. It now says that the page states how to report a security issue. `identity.contact.lastModified` becomes `2026-10-30`.

Additive, hence minor. Swift `Person` and `IdentityContact` gain properties, so their memberwise initializers take more arguments. `CopyLoader` decodes the bundled JSON and calls neither, and a grep of this repository and the iOS app finds no other caller.

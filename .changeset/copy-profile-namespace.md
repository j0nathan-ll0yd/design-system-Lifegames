---
'@j0nathan-ll0yd/copy': minor
---

New `profile` namespace: the authored identity content of the dashboard's IdentityCard and
BioTerminal that `identity` does not already hold (atlas decision 0160 Step 1.7).

- `profile.tagline`: the identity card's subtitle.
- `profile.terminal.{gpg, stack, uptime, philosophy, interests}`: the bio terminal's command blocks,
  in display order. Each block is its prompt line (`$ `) then its output lines (`→ `); a consumer
  adds a blank line between blocks and the closing cursor.

The name, title, location, profile links and bio stay in `identity.person` (`name`, `jobTitle`,
`location`, `sameAs`, `flavorBio`); `profile` does not repeat them. Every string is byte-identical
to the `@j0nathan-ll0yd/fixtures` profile baseline it replaces. No coordinates and no avatar path:
location data is out of scope (decision 0160 D14), and the avatar is a site asset, not copy.

New: `profile` and its `ProfileCopy` type from the package root, `./profile.flat.json`,
`./profile.zod` (`profileSchema`), and in Swift the `ProfileCopy` and `ProfileTerminal` structs with
`CopyLoader.loadProfile()` and `CopyLoader.profile`.

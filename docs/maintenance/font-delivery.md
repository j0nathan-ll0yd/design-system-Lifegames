# Font Delivery Mechanism

## Overview

`SpaceGrotesk-Variable.ttf` is **not tracked in git**. The directory
`Sources/LifegamesTokens/Resources/Fonts/` contains only a placeholder
(`README.md`) to preserve the directory in version control.

The font binary must be placed there manually before building any Swift target
that calls `LifegamesFonts.registerFonts()`.

## Where the font binary lives

The font is not bundled in this repository. It must be sourced from one of:

- The [Space Grotesk GitHub releases](https://github.com/floriankarsten/space-grotesk/releases) — download `SpaceGrotesk-Variable.ttf` from the latest release.
- The Google Fonts CDN: `https://fonts.gstatic.com/s/spacegrotesk/` (variable font build).
- An existing local copy in the iOS consumer repo (`ios-LifegamesPortal`).

The SIL Open Font License (OFL 1.1) applies — see `LICENSES/OFL.txt`.

## How consumers receive it

SPM uses `.process("Resources")` in `Package.swift` to bundle everything under
`Sources/LifegamesTokens/Resources/` into `Bundle.module`. `FontRegistration.swift`
resolves the font at runtime via:

```swift
Bundle.module.url(forResource: "SpaceGrotesk-Variable", withExtension: "ttf", subdirectory: "Fonts")
```

For the font to be available at runtime, `SpaceGrotesk-Variable.ttf` must be
present in `Sources/LifegamesTokens/Resources/Fonts/` **at build time**. SPM
copies it into the app bundle during compilation.

**Consumer setup steps:**

1. Download `SpaceGrotesk-Variable.ttf`.
2. Copy it to `Sources/LifegamesTokens/Resources/Fonts/SpaceGrotesk-Variable.ttf`.
3. Build normally — SPM picks it up via `.process("Resources")`.
4. Call `LifegamesFonts.registerFonts()` at app launch (already done in `SwiftGalleryApp.swift` and required for any iOS/watchOS consumer).

## What happens if the font is missing

`FontRegistration.swift` uses a `guard` with `continue` on the URL lookup:

```swift
guard let url = Bundle.module.url(forResource: font, withExtension: "ttf", subdirectory: "Fonts") else { continue }
```

**Result: silent fallback.** No crash, no log output, no warning. The app runs
normally but all views using `LGFont.*` token values fall back to the system
default font (San Francisco on iOS/watchOS). Typography showcase in swift-gallery
will display system fonts instead of Space Grotesk with no visible error.

## Why the font is not committed

The font binary was intentionally excluded from the initial commit (see commit
`208f8ec`). The `Fonts/` directory was created with a `.gitkeep` (now replaced
by this `README.md`) as a placeholder, establishing the SPM resource path
without committing a binary blob. This is consistent with the OFL requirement
that redistribution include the license notice — consumers sourcing the font
directly satisfy this requirement themselves.

A future improvement would be to add a pre-build script or CI check that
verifies the font file is present and emits a warning if absent, rather than
silently falling back.

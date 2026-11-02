# Font Delivery Mechanism

## Overview

The Swift runtime ships five static Space Grotesk faces, one per weight in
`SWIFT_FONT_WEIGHT` (`style-dictionary.config.mjs`):

| File                         | PostScript name         | Weight |
| ---------------------------- | ----------------------- | ------ |
| `SpaceGrotesk-Light.ttf`     | `SpaceGrotesk-Light`    | 300    |
| `SpaceGrotesk-Regular.ttf`   | `SpaceGrotesk-Regular`  | 400    |
| `SpaceGrotesk-Medium.ttf`    | `SpaceGrotesk-Medium`   | 500    |
| `SpaceGrotesk-SemiBold.ttf`  | `SpaceGrotesk-SemiBold` | 600    |
| `SpaceGrotesk-Bold.ttf`      | `SpaceGrotesk-Bold`     | 700    |

All five live in `Sources/LifegamesTokens/Resources/Fonts/` and are tracked in git. They are
generated from `SpaceGrotesk-Variable.ttf` (Space Grotesk Version 2.000, `wght` 300–700) in the
same directory. The variable file is the instancing source only. `Package.swift` excludes it
from the `LifegamesTokens` bundle.

The SIL Open Font License (OFL 1.1) applies. See `LICENSES/OFL.txt`. The license declares no
Reserved Font Name, so the derived faces keep the Space Grotesk name.

## Why static faces, not the variable font

Measured on the iOS 26.5 simulator (Xcode 26.6), with the variable font registered:

- `UIFont(name:size:)` resolves only `SpaceGrotesk-Light`, the variable font's default
  PostScript name. `SpaceGrotesk-Regular`, `-Medium` and `-Bold` return `nil`. The variable font's
  named instances carry no PostScript name IDs, and iOS does not match them by name.
- The variable font has no SemiBold named instance at all.
- `Font.custom(...).weight(_:)` and `.fontWeight(_:)` on a name-resolved face log
  `Unable to update Font Descriptor's weight to Weight(value: …)` and keep the original weight.

So every `Font.Tokens` face fell back to the system font. macOS matches some of these names,
which hid the defect from `swift test`. Static faces with real PostScript names resolve exactly
on both platforms and keep `Font.custom(_:size:relativeTo:)` Dynamic Type scaling.

## Regenerating the faces

fontTools is not a repo dependency. Use a throwaway virtual environment:

```sh
python3 -m venv /tmp/ft-venv && /tmp/ft-venv/bin/pip install fonttools
/tmp/ft-venv/bin/python -I scripts/fonts/instance-space-grotesk.py
```

The script keeps the source `head.modified` timestamp, so a re-run writes identical bytes.
Add a weight to `SWIFT_FONT_WEIGHT` and the script's `WEIGHTS` together, and add the face to
`LifegamesFonts.faces` (`FontRegistration.swift` and its golden copy).

## How consumers receive the faces

SPM's `.process("Resources")` flattens `Resources/Fonts/` into the bundle root, so
`FontRegistration.swift` looks each face up without a subdirectory:

```swift
Bundle.module.url(forResource: face, withExtension: "ttf")
```

Consumers call `LifegamesFonts.registerFonts()` once at launch, in every process that renders
DS text. The iOS app, the widget extension and `SwiftGalleryApp.swift` do this.

## Failure behavior

A missing face or a failed registration logs an error to the unified log (subsystem
`com.lifegames.design-system`, category `fonts`). Tokens that name that face then fall back to
the system font. `Tests/LifegamesTokensTests/FontResolutionTests.swift` fails if any token
resolves to a face other than the one it names.

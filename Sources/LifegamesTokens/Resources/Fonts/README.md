# Fonts

`SpaceGrotesk-{Light,Regular,Medium,SemiBold,Bold}.ttf` are the runtime faces that
`LifegamesFonts.registerFonts()` registers. `scripts/fonts/instance-space-grotesk.py`
generates them from `SpaceGrotesk-Variable.ttf`. `Package.swift` excludes the variable
source from the bundle. See `docs/maintenance/font-delivery.md`.

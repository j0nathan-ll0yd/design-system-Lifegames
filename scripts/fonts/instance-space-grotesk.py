"""Instance the Space Grotesk variable font into the static faces the Swift tokens name.

iOS resolves a registered variable font by its default PostScript name only
(SpaceGrotesk-Light). The named instances (Regular, Medium, Bold) do not resolve by
name, the font has no SemiBold instance at all, and SwiftUI cannot apply .fontWeight
to a name-resolved custom face. Every Font.Tokens face therefore fell back to the
system font. Static faces with real PostScript names resolve exactly, keep
Font.custom(_:size:relativeTo:) Dynamic Type scaling, and use the same outlines the
web renders from the same variable source.

Usage (fontTools is not a repo dependency; use a throwaway venv):
    python3 -m venv /tmp/ft-venv && /tmp/ft-venv/bin/pip install fonttools
    /tmp/ft-venv/bin/python -I scripts/fonts/instance-space-grotesk.py

Reads Sources/LifegamesTokens/Resources/Fonts/SpaceGrotesk-Variable.ttf (excluded
from the SwiftPM bundle in Package.swift) and writes SpaceGrotesk-<Weight>.ttf next
to it. The weight table mirrors SWIFT_FONT_WEIGHT in style-dictionary.config.mjs.
"""

from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

FAMILY = "Space Grotesk"
PS_FAMILY = "SpaceGrotesk"
WEIGHTS = {300: "Light", 400: "Regular", 500: "Medium", 600: "SemiBold", 700: "Bold"}

FONTS_DIR = Path(__file__).resolve().parents[2] / "Sources/LifegamesTokens/Resources/Fonts"
SOURCE = FONTS_DIR / "SpaceGrotesk-Variable.ttf"

# fsSelection bits (OpenType OS/2 spec).
FS_ITALIC, FS_BOLD, FS_REGULAR = 1 << 0, 1 << 5, 1 << 6
MAC_STYLE_BOLD = 1 << 0


def set_name(font, name_id, value):
    # Windows Unicode English (3, 1, 0x409) and Mac Roman (1, 0, 0): the two records the source carries.
    font["name"].setName(value, name_id, 3, 1, 0x409)
    font["name"].setName(value, name_id, 1, 0, 0)


def build(weight, style):
    # recalcTimestamp=False keeps the source head.modified, so a re-run writes identical bytes.
    font = instantiateVariableFont(TTFont(SOURCE, recalcTimestamp=False), {"wght": weight}, updateFontNames=False)
    version = font["name"].getDebugName(5)
    ribbi = style in ("Regular", "Bold")
    # Name IDs 1/2 form the legacy four-style group: Regular and Bold share the family,
    # every other weight is its own family with subfamily Regular.
    set_name(font, 1, FAMILY if ribbi else f"{FAMILY} {style}")
    set_name(font, 2, style if ribbi else "Regular")
    set_name(font, 3, f"{version};{PS_FAMILY}-{style}")
    set_name(font, 4, f"{FAMILY} {style}")
    set_name(font, 6, f"{PS_FAMILY}-{style}")
    set_name(font, 16, FAMILY)
    set_name(font, 17, style)
    # Name ID 25 is the variations PostScript name prefix; a static face has none.
    font["name"].removeNames(nameID=25)

    os2 = font["OS/2"]
    os2.usWeightClass = weight
    fs = os2.fsSelection & ~(FS_ITALIC | FS_BOLD | FS_REGULAR)
    os2.fsSelection = fs | (FS_BOLD if style == "Bold" else FS_REGULAR)
    head = font["head"]
    head.macStyle = (head.macStyle & ~MAC_STYLE_BOLD) | (MAC_STYLE_BOLD if style == "Bold" else 0)
    # A full instance keeps no axes, so STAT describes nothing; DSIG would sign the
    # source bytes, not these.
    for tag in ("STAT", "DSIG"):
        if tag in font:
            del font[tag]

    out = FONTS_DIR / f"{PS_FAMILY}-{style}.ttf"
    font.save(out)
    return out


def main():
    for weight, style in WEIGHTS.items():
        print(build(weight, style).relative_to(FONTS_DIR.parents[3]))


if __name__ == "__main__":
    main()

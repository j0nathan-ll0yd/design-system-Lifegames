import Foundation
#if canImport(DeveloperToolsSupport)
import DeveloperToolsSupport
#endif

#if SWIFT_PACKAGE
private let resourceBundle = Foundation.Bundle.module
#else
private class ResourceBundleClass {}
private let resourceBundle = Foundation.Bundle(for: ResourceBundleClass.self)
#endif

// MARK: - Color Symbols -

@available(iOS 17.0, macOS 14.0, tvOS 17.0, watchOS 10.0, *)
extension DeveloperToolsSupport.ColorResource {

    /// The "card-background" asset catalog color resource.
    static let cardBackground = DeveloperToolsSupport.ColorResource(name: "card-background", bundle: resourceBundle)

    /// The "card-border" asset catalog color resource.
    static let cardBorder = DeveloperToolsSupport.ColorResource(name: "card-border", bundle: resourceBundle)

    /// The "card-border-hover" asset catalog color resource.
    static let cardBorderHover = DeveloperToolsSupport.ColorResource(name: "card-border-hover", bundle: resourceBundle)

    /// The "card-glass-border" asset catalog color resource.
    static let cardGlassBorder = DeveloperToolsSupport.ColorResource(name: "card-glass-border", bundle: resourceBundle)

    /// The "color-accent-amber" asset catalog color resource.
    static let colorAccentAmber = DeveloperToolsSupport.ColorResource(name: "color-accent-amber", bundle: resourceBundle)

    /// The "color-accent-blue" asset catalog color resource.
    static let colorAccentBlue = DeveloperToolsSupport.ColorResource(name: "color-accent-blue", bundle: resourceBundle)

    /// The "color-accent-cyan" asset catalog color resource.
    static let colorAccentCyan = DeveloperToolsSupport.ColorResource(name: "color-accent-cyan", bundle: resourceBundle)

    /// The "color-accent-default" asset catalog color resource.
    static let colorAccentDefault = DeveloperToolsSupport.ColorResource(name: "color-accent-default", bundle: resourceBundle)

    /// The "color-accent-green" asset catalog color resource.
    static let colorAccentGreen = DeveloperToolsSupport.ColorResource(name: "color-accent-green", bundle: resourceBundle)

    /// The "color-accent-hc-pink" asset catalog color resource.
    static let colorAccentHcPink = DeveloperToolsSupport.ColorResource(name: "color-accent-hc-pink", bundle: resourceBundle)

    /// The "color-accent-hc-purple" asset catalog color resource.
    static let colorAccentHcPurple = DeveloperToolsSupport.ColorResource(name: "color-accent-hc-purple", bundle: resourceBundle)

    /// The "color-accent-hc-red" asset catalog color resource.
    static let colorAccentHcRed = DeveloperToolsSupport.ColorResource(name: "color-accent-hc-red", bundle: resourceBundle)

    /// The "color-accent-indigo" asset catalog color resource.
    static let colorAccentIndigo = DeveloperToolsSupport.ColorResource(name: "color-accent-indigo", bundle: resourceBundle)

    /// The "color-accent-orange" asset catalog color resource.
    static let colorAccentOrange = DeveloperToolsSupport.ColorResource(name: "color-accent-orange", bundle: resourceBundle)

    /// The "color-accent-pink" asset catalog color resource.
    static let colorAccentPink = DeveloperToolsSupport.ColorResource(name: "color-accent-pink", bundle: resourceBundle)

    /// The "color-accent-purple" asset catalog color resource.
    static let colorAccentPurple = DeveloperToolsSupport.ColorResource(name: "color-accent-purple", bundle: resourceBundle)

    /// The "color-accent-red" asset catalog color resource.
    static let colorAccentRed = DeveloperToolsSupport.ColorResource(name: "color-accent-red", bundle: resourceBundle)

    /// The "color-amber-500" asset catalog color resource.
    static let colorAmber500 = DeveloperToolsSupport.ColorResource(name: "color-amber-500", bundle: resourceBundle)

    /// The "color-apple-health-green" asset catalog color resource.
    static let colorAppleHealthGreen = DeveloperToolsSupport.ColorResource(name: "color-apple-health-green", bundle: resourceBundle)

    /// The "color-blue-500" asset catalog color resource.
    static let colorBlue500 = DeveloperToolsSupport.ColorResource(name: "color-blue-500", bundle: resourceBundle)

    /// The "color-blue-600" asset catalog color resource.
    static let colorBlue600 = DeveloperToolsSupport.ColorResource(name: "color-blue-600", bundle: resourceBundle)

    /// The "color-border-default" asset catalog color resource.
    static let colorBorderDefault = DeveloperToolsSupport.ColorResource(name: "color-border-default", bundle: resourceBundle)

    /// The "color-border-interactive" asset catalog color resource.
    static let colorBorderInteractive = DeveloperToolsSupport.ColorResource(name: "color-border-interactive", bundle: resourceBundle)

    /// The "color-border-strong" asset catalog color resource.
    static let colorBorderStrong = DeveloperToolsSupport.ColorResource(name: "color-border-strong", bundle: resourceBundle)

    /// The "color-border-subtle" asset catalog color resource.
    static let colorBorderSubtle = DeveloperToolsSupport.ColorResource(name: "color-border-subtle", bundle: resourceBundle)

    /// The "color-cyan-500" asset catalog color resource.
    static let colorCyan500 = DeveloperToolsSupport.ColorResource(name: "color-cyan-500", bundle: resourceBundle)

    /// The "color-gray-900" asset catalog color resource.
    static let colorGray900 = DeveloperToolsSupport.ColorResource(name: "color-gray-900", bundle: resourceBundle)

    /// The "color-gray-950" asset catalog color resource.
    static let colorGray950 = DeveloperToolsSupport.ColorResource(name: "color-gray-950", bundle: resourceBundle)

    /// The "color-green-500" asset catalog color resource.
    static let colorGreen500 = DeveloperToolsSupport.ColorResource(name: "color-green-500", bundle: resourceBundle)

    /// The "color-health-green" asset catalog color resource.
    static let colorHealthGreen = DeveloperToolsSupport.ColorResource(name: "color-health-green", bundle: resourceBundle)

    /// The "color-health-purple" asset catalog color resource.
    static let colorHealthPurple = DeveloperToolsSupport.ColorResource(name: "color-health-purple", bundle: resourceBundle)

    /// The "color-health-red" asset catalog color resource.
    static let colorHealthRed = DeveloperToolsSupport.ColorResource(name: "color-health-red", bundle: resourceBundle)

    /// The "color-indigo-500" asset catalog color resource.
    static let colorIndigo500 = DeveloperToolsSupport.ColorResource(name: "color-indigo-500", bundle: resourceBundle)

    /// The "color-indigo-600" asset catalog color resource.
    static let colorIndigo600 = DeveloperToolsSupport.ColorResource(name: "color-indigo-600", bundle: resourceBundle)

    /// The "color-indigo-700" asset catalog color resource.
    static let colorIndigo700 = DeveloperToolsSupport.ColorResource(name: "color-indigo-700", bundle: resourceBundle)

    /// The "color-interactive-default" asset catalog color resource.
    static let colorInteractiveDefault = DeveloperToolsSupport.ColorResource(name: "color-interactive-default", bundle: resourceBundle)

    /// The "color-interactive-hover" asset catalog color resource.
    static let colorInteractiveHover = DeveloperToolsSupport.ColorResource(name: "color-interactive-hover", bundle: resourceBundle)

    /// The "color-orange-500" asset catalog color resource.
    static let colorOrange500 = DeveloperToolsSupport.ColorResource(name: "color-orange-500", bundle: resourceBundle)

    /// The "color-pink-400" asset catalog color resource.
    static let colorPink400 = DeveloperToolsSupport.ColorResource(name: "color-pink-400", bundle: resourceBundle)

    /// The "color-pink-500" asset catalog color resource.
    static let colorPink500 = DeveloperToolsSupport.ColorResource(name: "color-pink-500", bundle: resourceBundle)

    /// The "color-purple-400" asset catalog color resource.
    static let colorPurple400 = DeveloperToolsSupport.ColorResource(name: "color-purple-400", bundle: resourceBundle)

    /// The "color-purple-500" asset catalog color resource.
    static let colorPurple500 = DeveloperToolsSupport.ColorResource(name: "color-purple-500", bundle: resourceBundle)

    /// The "color-purple-600" asset catalog color resource.
    static let colorPurple600 = DeveloperToolsSupport.ColorResource(name: "color-purple-600", bundle: resourceBundle)

    /// The "color-red-400" asset catalog color resource.
    static let colorRed400 = DeveloperToolsSupport.ColorResource(name: "color-red-400", bundle: resourceBundle)

    /// The "color-red-500" asset catalog color resource.
    static let colorRed500 = DeveloperToolsSupport.ColorResource(name: "color-red-500", bundle: resourceBundle)

    /// The "color-red-apple" asset catalog color resource.
    static let colorRedApple = DeveloperToolsSupport.ColorResource(name: "color-red-apple", bundle: resourceBundle)

    /// The "color-sleep-deep" asset catalog color resource.
    static let colorSleepDeep = DeveloperToolsSupport.ColorResource(name: "color-sleep-deep", bundle: resourceBundle)

    /// The "color-surface-artifact-frame" asset catalog color resource.
    static let colorSurfaceArtifactFrame = DeveloperToolsSupport.ColorResource(name: "color-surface-artifact-frame", bundle: resourceBundle)

    /// The "color-surface-base" asset catalog color resource.
    static let colorSurfaceBase = DeveloperToolsSupport.ColorResource(name: "color-surface-base", bundle: resourceBundle)

    /// The "color-surface-citation" asset catalog color resource.
    static let colorSurfaceCitation = DeveloperToolsSupport.ColorResource(name: "color-surface-citation", bundle: resourceBundle)

    /// The "color-surface-code-block" asset catalog color resource.
    static let colorSurfaceCodeBlock = DeveloperToolsSupport.ColorResource(name: "color-surface-code-block", bundle: resourceBundle)

    /// The "color-surface-code-block-diff-added" asset catalog color resource.
    static let colorSurfaceCodeBlockDiffAdded = DeveloperToolsSupport.ColorResource(name: "color-surface-code-block-diff-added", bundle: resourceBundle)

    /// The "color-surface-code-block-diff-removed" asset catalog color resource.
    static let colorSurfaceCodeBlockDiffRemoved = DeveloperToolsSupport.ColorResource(name: "color-surface-code-block-diff-removed", bundle: resourceBundle)

    /// The "color-surface-deep" asset catalog color resource.
    static let colorSurfaceDeep = DeveloperToolsSupport.ColorResource(name: "color-surface-deep", bundle: resourceBundle)

    /// The "color-surface-inset" asset catalog color resource.
    static let colorSurfaceInset = DeveloperToolsSupport.ColorResource(name: "color-surface-inset", bundle: resourceBundle)

    /// The "color-surface-raised" asset catalog color resource.
    static let colorSurfaceRaised = DeveloperToolsSupport.ColorResource(name: "color-surface-raised", bundle: resourceBundle)

    /// The "color-surface-raised-hover" asset catalog color resource.
    static let colorSurfaceRaisedHover = DeveloperToolsSupport.ColorResource(name: "color-surface-raised-hover", bundle: resourceBundle)

    /// The "color-surface-thinking" asset catalog color resource.
    static let colorSurfaceThinking = DeveloperToolsSupport.ColorResource(name: "color-surface-thinking", bundle: resourceBundle)

    /// The "color-surface-tool-use" asset catalog color resource.
    static let colorSurfaceToolUse = DeveloperToolsSupport.ColorResource(name: "color-surface-tool-use", bundle: resourceBundle)

    /// The "color-text-disabled" asset catalog color resource.
    static let colorTextDisabled = DeveloperToolsSupport.ColorResource(name: "color-text-disabled", bundle: resourceBundle)

    /// The "color-text-muted" asset catalog color resource.
    static let colorTextMuted = DeveloperToolsSupport.ColorResource(name: "color-text-muted", bundle: resourceBundle)

    /// The "color-text-primary" asset catalog color resource.
    static let colorTextPrimary = DeveloperToolsSupport.ColorResource(name: "color-text-primary", bundle: resourceBundle)

    /// The "color-text-subtle" asset catalog color resource.
    static let colorTextSubtle = DeveloperToolsSupport.ColorResource(name: "color-text-subtle", bundle: resourceBundle)

    /// The "color-text-title" asset catalog color resource.
    static let colorTextTitle = DeveloperToolsSupport.ColorResource(name: "color-text-title", bundle: resourceBundle)

    /// The "color-white-pure" asset catalog color resource.
    static let colorWhitePure = DeveloperToolsSupport.ColorResource(name: "color-white-pure", bundle: resourceBundle)

    /// The "color-zinc-100" asset catalog color resource.
    static let colorZinc100 = DeveloperToolsSupport.ColorResource(name: "color-zinc-100", bundle: resourceBundle)

    /// The "color-zinc-200" asset catalog color resource.
    static let colorZinc200 = DeveloperToolsSupport.ColorResource(name: "color-zinc-200", bundle: resourceBundle)

    /// The "color-zinc-300" asset catalog color resource.
    static let colorZinc300 = DeveloperToolsSupport.ColorResource(name: "color-zinc-300", bundle: resourceBundle)

    /// The "color-zinc-400" asset catalog color resource.
    static let colorZinc400 = DeveloperToolsSupport.ColorResource(name: "color-zinc-400", bundle: resourceBundle)

    /// The "color-zinc-500" asset catalog color resource.
    static let colorZinc500 = DeveloperToolsSupport.ColorResource(name: "color-zinc-500", bundle: resourceBundle)

    /// The "color-zinc-600" asset catalog color resource.
    static let colorZinc600 = DeveloperToolsSupport.ColorResource(name: "color-zinc-600", bundle: resourceBundle)

    /// The "color-zinc-700" asset catalog color resource.
    static let colorZinc700 = DeveloperToolsSupport.ColorResource(name: "color-zinc-700", bundle: resourceBundle)

}

// MARK: - Image Symbols -

@available(iOS 17.0, macOS 14.0, tvOS 17.0, watchOS 10.0, *)
extension DeveloperToolsSupport.ImageResource {

}


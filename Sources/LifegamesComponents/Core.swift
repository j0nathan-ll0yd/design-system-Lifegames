// LifegamesComponents re-exports LifegamesComponentsCore so that every
// caller depending on LifegamesComponents (apps/swift-gallery, the iOS-
// consumer app, every Sources/LifegamesWidgets/* view) sees the cross-
// platform modifiers (gradientBackground, portalCard, neonCard, ...) and
// shared views (HealthRingView, MetricCardView, ...) without having to
// add a second `import LifegamesComponentsCore` line in every file.
//
// Targets that DO NOT depend on LifegamesComponents (currently only
// LifegamesWidgetsWatch and its tests) MUST `import LifegamesComponentsCore`
// directly.
//
// IMPORTANT: Do NOT also define the re-exported symbols inside
// LifegamesComponents -- that creates an "ambiguous use" compile error
// because each caller sees the same symbol via two import paths. The
// June 2026 audit's R19 refactor originally tripped this; see
// fix(swift) commit in audit/2026-06-followup.
@_exported import LifegamesComponentsCore

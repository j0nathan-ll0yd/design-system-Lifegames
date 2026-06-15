# ADR-0003 — Screen Scaffold P6 Override (BDFL)

## Context

P6 promotes organisms to shared components only after they recur in ≥3 stable contexts; until then organisms are documented as patterns and kept local. Screens are organisms. The four screen shapes this work generalizes (`AuthTemplate`, `SettingsTemplate`, `ProfileTemplate`, `ListTemplate`) have **one** identified context (OMD) and **zero** shipping product surfaces today (Part 2 wires OMD later; the swift-gallery showcase is excluded from the P4 surface count). Strict P6 plus the Rule of Three therefore say: document these as patterns, do not promote screen-level shells now. The maintainer (sole BDFL, P8) has nonetheless elected to build the four slot-based scaffolds immediately so Part 2 can fill slots rather than rebuild screens.

## Decision

Under P8 authority, **override P6** and build the four scaffolds now in a new `LifegamesTemplates` target at `Experimental`, accepting the Rule-of-Three / wrong-abstraction risk. The override is **bounded** by three hard rails: (a) **slot purity** — `LifegamesTemplates` imports only `LifegamesComponents`, `LifegamesComponentsCore`, `LifegamesTokens`, and `SwiftUI`; it contains zero OMD modules, copy, data types, or download semantics; every static text is `LocalizedStringKey` and every datum is generic or injected; (b) **`Experimental` status** — the interface carries no stability promise and may change when a real consumer pins it; (c) **scope** — limited to the four genuinely-universal screens (Auth, Settings, Profile, List); Launch is absorbed as the `AuthTemplate` branding slot, and `FileDetail` / `MainTabShell` / `SampleFiles` stay app-local. The target is **never** added to any watch target.

## Consequence

A scaffold is a pure shell, never a screen: it exposes `@ViewBuilder` slots, injected `LocalizedStringKey` text, injected `@Sendable` actions, and an injected accent, and holds no app assumptions to be "wrong" about. If a second app fights a scaffold, the override is reversible — the scaffold regresses to `Beta` or pattern-only with no app-specific entanglement to unwind. The risk is real but small and explicitly accepted here; Part 2 implements OMD screens as thin slot fills against these `Experimental` scaffolds.

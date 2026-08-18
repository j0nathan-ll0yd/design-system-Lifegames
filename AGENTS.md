# Agents Guide — Lifegames Design System

## Repository Structure

- `tokens/` — W3C DTCG JSON token source of truth
- `packages/tokens/` — Style Dictionary build; outputs CSS, JS, JSON
- `packages/web/` — Astro components and 29 web widgets with Storybook stories
- `Sources/` — Swift packages (SPM targets at repo root)
- `Tests/` — Swift test targets
- `apps/docs/` — Astro Starlight documentation
- `apps/storybook/` — Storybook 10 workshop

## Key Constraints

1. `Package.swift` at repo root — non-negotiable SPM requirement
2. Fixtures in `Sources/LifegamesWidgets/Resources/widgets/` — SPM `Bundle.module` requirement
3. Web accesses fixtures via Vite `@fixtures` alias
4. All neon colors MUST resolve to identical hex values across web and iOS
5. Changes land on `main` and ship as versioned `@j0nathan-ll0yd/*` packages to GitHub Packages (yalc retired — atlas#1 / decision 0015). The historical "Phase 1, everything local, no `git push`" rule no longer applies.

## Token Pipeline

```
tokens/*.tokens.json → style-dictionary.config.mjs → packages/tokens/dist/ (CSS/JS/JSON)
                                                    → Sources/LifegamesTokens/ (Swift)
```

## Build Commands

- `pnpm build:tokens` — generate token outputs
- `pnpm build` — build all packages
- `swift build` — build all Swift targets
- `swift test` — run Swift tests

# DTCG 2025.10 Conformance Audit Report

Generated: 2026-06-07T00:02:40.483Z
Spec reference: https://tr.designtokens.org/format/ (2025.10 stable)

## Summary

| Metric | Value |
|---|---|
| Source files validated | 11 |
| Dist DTCG files validated | 1 |
| Total violations | 106 |
| Violation types | 1 |

## Scope Exclusions

- `tokens/projections/**` — projection mapping tables (not DTCG tokens); explicitly excluded per plan.

## Violations by Rule

### MISSING_DESCRIPTION — Token leaf missing `$description`

106 occurrence(s)

| File | Token Path | Detail |
|---|---|---|
| `tokens/component/card.tokens.json` | `(root).card.background` | Token leaf is missing $description. |
| `tokens/component/card.tokens.json` | `(root).card.border` | Token leaf is missing $description. |
| `tokens/component/card.tokens.json` | `(root).card.borderHover` | Token leaf is missing $description. |
| `tokens/component/card.tokens.json` | `(root).card.glassBorder` | Token leaf is missing $description. |
| `tokens/primitive/motion.tokens.json` | `(root).motion.delay.short` | Token leaf is missing $description. |
| `tokens/primitive/motion.tokens.json` | `(root).motion.delay.normal` | Token leaf is missing $description. |
| `tokens/primitive/shadow.tokens.json` | `(root).shadow.glow.pink` | Token leaf is missing $description. |
| `tokens/primitive/shadow.tokens.json` | `(root).shadow.glow.blue` | Token leaf is missing $description. |
| `tokens/primitive/shadow.tokens.json` | `(root).shadow.glow.green` | Token leaf is missing $description. |
| `tokens/primitive/shadow.tokens.json` | `(root).shadow.glow.amber` | Token leaf is missing $description. |
| `tokens/primitive/shadow.tokens.json` | `(root).shadow.glow.purple` | Token leaf is missing $description. |
| `tokens/primitive/shadow.tokens.json` | `(root).shadow.glow.red` | Token leaf is missing $description. |
| `tokens/primitive/shadow.tokens.json` | `(root).shadow.glow.cyan` | Token leaf is missing $description. |
| `tokens/primitive/shadow.tokens.json` | `(root).shadow.glow.orange` | Token leaf is missing $description. |
| `tokens/primitive/shadow.tokens.json` | `(root).shadow.glow.indigo` | Token leaf is missing $description. |
| `tokens/primitive/shadow.tokens.json` | `(root).shadow.glow.blueSm` | Token leaf is missing $description. |
| `tokens/primitive/shadow.tokens.json` | `(root).shadow.glow.greenSm` | Token leaf is missing $description. |
| `tokens/primitive/shadow.tokens.json` | `(root).shadow.glow.amberSm` | Token leaf is missing $description. |
| `tokens/primitive/shadow.tokens.json` | `(root).shadow.glow.purpleSm` | Token leaf is missing $description. |
| `tokens/primitive/shadow.tokens.json` | `(root).shadow.glow.redSm` | Token leaf is missing $description. |
| `tokens/primitive/shadow.tokens.json` | `(root).shadow.glow.cyanSm` | Token leaf is missing $description. |
| `tokens/primitive/shadow.tokens.json` | `(root).shadow.glow.orangeSm` | Token leaf is missing $description. |
| `tokens/primitive/shadow.tokens.json` | `(root).shadow.glow.indigoSm` | Token leaf is missing $description. |
| `tokens/primitive/spacing.tokens.json` | `(root).space.250` | Token leaf is missing $description. |
| `tokens/primitive/spacing.tokens.json` | `(root).space.300` | Token leaf is missing $description. |
| `tokens/primitive/spacing.tokens.json` | `(root).space.350` | Token leaf is missing $description. |
| `tokens/primitive/spacing.tokens.json` | `(root).space.600` | Token leaf is missing $description. |
| `tokens/primitive/spacing.tokens.json` | `(root).space.700` | Token leaf is missing $description. |
| `tokens/primitive/spacing.tokens.json` | `(root).space.1000` | Token leaf is missing $description. |
| `tokens/primitive/typography.tokens.json` | `(root).font.family.brand` | Token leaf is missing $description. |
| `tokens/primitive/typography.tokens.json` | `(root).font.family.brandFallback` | Token leaf is missing $description. |
| `tokens/primitive/typography.tokens.json` | `(root).font.family.system` | Token leaf is missing $description. |
| `tokens/primitive/typography.tokens.json` | `(root).font.weight.light` | Token leaf is missing $description. |
| `tokens/primitive/typography.tokens.json` | `(root).font.weight.regular` | Token leaf is missing $description. |
| `tokens/primitive/typography.tokens.json` | `(root).font.weight.medium` | Token leaf is missing $description. |
| `tokens/primitive/typography.tokens.json` | `(root).font.weight.semibold` | Token leaf is missing $description. |
| `tokens/primitive/typography.tokens.json` | `(root).font.weight.bold` | Token leaf is missing $description. |
| `tokens/primitive/typography.tokens.json` | `(root).iosTypography.caption2` | Token leaf is missing $description. |
| `tokens/primitive/typography.tokens.json` | `(root).iosTypography.caption` | Token leaf is missing $description. |
| `tokens/primitive/typography.tokens.json` | `(root).iosTypography.footnote` | Token leaf is missing $description. |
| `tokens/primitive/typography.tokens.json` | `(root).iosTypography.callout` | Token leaf is missing $description. |
| `tokens/semantic/color.tokens.json` | `(root).color.accent.pink` | Token leaf is missing $description. |
| `tokens/semantic/color.tokens.json` | `(root).color.accent.blue` | Token leaf is missing $description. |
| `tokens/semantic/color.tokens.json` | `(root).color.accent.green` | Token leaf is missing $description. |
| `tokens/semantic/color.tokens.json` | `(root).color.accent.amber` | Token leaf is missing $description. |
| `tokens/semantic/color.tokens.json` | `(root).color.accent.purple` | Token leaf is missing $description. |
| `tokens/semantic/color.tokens.json` | `(root).color.accent.red` | Token leaf is missing $description. |
| `tokens/semantic/color.tokens.json` | `(root).color.accent.cyan` | Token leaf is missing $description. |
| `tokens/semantic/color.tokens.json` | `(root).color.accent.orange` | Token leaf is missing $description. |
| `tokens/semantic/color.tokens.json` | `(root).color.accent.indigo` | Token leaf is missing $description. |
| ... | ... | *(56 more)* |

## Composite-Type Token Candidates

The following token groups use $type values that should be represented as
composite types per DTCG 2025.10 (typography, shadow, transition):

| Composite Type | Files Using It |
|---|---|
| `typography` | 2 |
| `shadow` | 2 |
| `transition` | 1 |

## Files Validated

### Source token files (`tokens/**/*.tokens.json`, excluding projections)

- `tokens/component/card.tokens.json`
- `tokens/primitive/color.tokens.json`
- `tokens/primitive/motion.tokens.json`
- `tokens/primitive/shadow.tokens.json`
- `tokens/primitive/spacing.tokens.json`
- `tokens/primitive/typography.tokens.json`
- `tokens/semantic/ai-surfaces.tokens.json`
- `tokens/semantic/color.tokens.json`
- `tokens/semantic/shadow.tokens.json`
- `tokens/semantic/transition.tokens.json`
- `tokens/semantic/typography.tokens.json`

### Dist DTCG artifacts (`packages/tokens/dist/*.dtcg.json`)

- `packages/tokens/dist/tokens.dtcg.json`

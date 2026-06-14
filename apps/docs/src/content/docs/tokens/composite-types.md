---
title: Composite Token Types
description: Typography, shadow, and transition composite tokens in the Lifegames Design System.
---

DTCG 2025.10 supports composite `$type` values whose `$value` is an object (or array of objects) rather than a scalar. The design system uses three composite types.

## Typography

Source: `tokens/semantic/typography.tokens.json`

Semantic typography tokens provide role-based shorthand for the primitive type scale in `tokens/primitive/typography.tokens.json`.

Each typography token emits per-property CSS custom properties:

```css
--lg-typography-body-font-size: clamp(0.72rem, 0.65rem + 0.2vw, 0.82rem);
--lg-typography-body-font-weight: 400;
--lg-typography-body-line-height: 1.5;
--lg-typography-body-font-family: 'Space Grotesk', sans-serif;
```

### Available tokens

| Token                 | Role                   | Font size                |
| --------------------- | ---------------------- | ------------------------ |
| `typography.display`  | Hero/display headings  | clamp(1.80rem … 2.20rem) |
| `typography.heading1` | Section headings       | clamp(1.60rem … 2.00rem) |
| `typography.heading2` | Subsection headings    | clamp(1.20rem … 1.50rem) |
| `typography.body`     | Default body text      | clamp(0.72rem … 0.82rem) |
| `typography.label`    | Form labels, UI labels | clamp(0.72rem … 0.82rem) |
| `typography.caption`  | Supporting text        | clamp(0.70rem … 0.78rem) |
| `typography.code`     | Monospaced code        | clamp(0.70rem … 0.78rem) |

### CSS consumption

```css
.my-heading {
  font-size: var(--lg-typography-heading1-font-size);
  font-weight: var(--lg-typography-heading1-font-weight);
  line-height: var(--lg-typography-heading1-line-height);
  font-family: var(--lg-typography-heading1-font-family);
}
```

## Shadow

Source: `tokens/primitive/shadow.tokens.json`, `tokens/semantic/shadow.tokens.json`

Shadow tokens use `$type: shadow` with `$value` as an array of shadow layer objects. Each layer has `offsetX`, `offsetY`, `blur`, `spread`, and `color`.

```css
/* Emitted as standard CSS box-shadow shorthand */
--lg-shadow-glow-pink:
  0px 0px 20px 0px rgba(255, 0, 110, 0.3), 0px 0px 40px 0px rgba(255, 0, 110, 0.15);
```

### CSS consumption

```css
.glowing-card {
  box-shadow: var(--lg-shadow-glow-accent);
}
```

## Transition

Source: `tokens/semantic/transition.tokens.json`

Transition tokens use `$type: transition` with `$value` as an object containing `duration`, `timingFunction`, and `delay` (all referencing motion tokens).

Each transition token emits a single shorthand CSS custom property:

```css
--lg-transition-default: 300ms {motion.easing.standard} 50ms;
--lg-transition-enter: 300ms {motion.easing.decelerate} 50ms;
--lg-transition-exit: 150ms {motion.easing.accelerate} 0ms;
--lg-transition-spring: 500ms {motion.easing.overshoot} 0ms;
--lg-transition-fast: 150ms {motion.easing.standard} 0ms;
```

### Available tokens

| Token                | Duration | Easing     | Use case                      |
| -------------------- | -------- | ---------- | ----------------------------- |
| `transition.default` | 300ms    | standard   | Most interactive elements     |
| `transition.fast`    | 150ms    | standard   | Hover states, focus rings     |
| `transition.enter`   | 300ms    | decelerate | Entering/appearing elements   |
| `transition.exit`    | 150ms    | accelerate | Exiting/disappearing elements |
| `transition.spring`  | 500ms    | overshoot  | Playful spring/bounce         |

### CSS consumption

```css
.interactive-button {
  transition:
    background-color var(--lg-transition-fast),
    transform var(--lg-transition-enter);
}
```

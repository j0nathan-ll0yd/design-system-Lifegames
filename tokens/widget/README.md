# Widget Token Tier

Widget tokens are **optional** sub-overrides in the four-tier token system:

```
primitive → semantic → component → widget
```

Most widgets use semantic or component tokens directly. Only author a widget-tier token when a widget genuinely needs a value that differs from the semantic tier.

## Convention

- File: `tokens/widget/<widget-name>.tokens.json`
- Naming: `widget.<kebab-case-widget-name>.<property>`
- Example: `widget.heart-rate.glow-color` overrides `color.accent.green` specifically for the HeartRate widget's glow effect

## When to create widget tokens

- A widget needs a color that differs from any semantic accent
- A widget has spacing that deviates from the component card tokens
- A widget has a unique glow/shadow not covered by the 9 standard glows

## When NOT to create widget tokens

- The widget uses a standard semantic accent — just reference `color.accent.*`
- The widget uses standard card padding — just reference `card.padding`
- The value is the same as a semantic token — don't duplicate

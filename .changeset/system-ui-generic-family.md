---
'@j0nathan-ll0yd/tokens': patch
---

Emit the `system-ui` font family bare in `packages/tokens` CSS. `--lg-font-family-system` read `'system-ui', sans-serif`; quoted, `system-ui` names a font family no system has, so text fell through to `sans-serif` instead of the platform UI font. It now reads `system-ui, sans-serif` in `tokens.css` and `tokens-layered.css`. The emitter keeps every CSS generic family keyword bare. No other token value changes.

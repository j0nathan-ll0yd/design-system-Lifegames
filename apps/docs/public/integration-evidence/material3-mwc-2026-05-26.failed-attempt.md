# Material 3 MWC Smoke Verification — Failed Attempt

**Date:** 2026-05-26
**Attempted by:** worker-1 (automated build)
**Status:** Could not complete — Material Theme Builder / m3.material.io not accessible at execution time.

## What was attempted

End-to-end smoke verification per B2 acceptance criteria:
1. Import `packages/tokens/dist/m3.css` into a Material Web Components fixture
2. Render `md-filled-button`, `md-elevated-card`, `md-outlined-text-field`
3. Verify visual fidelity via screenshot
4. Commit screenshot to `apps/docs/public/integration-evidence/`

## Blocker

The build environment does not have browser/DOM access for rendering MWC components. Material Theme Builder at m3.material.io requires a live browser session. `@material/web` npm package requires a DOM environment to instantiate custom elements.

## Reproduction steps (manual verification)

To complete this verification manually:

```bash
# 1. Install @material/web in a test harness
mkdir /tmp/m3-smoke && cd /tmp/m3-smoke
npm init -y
npm install @material/web

# 2. Create index.html
cat > index.html << 'HTML'
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="<path-to-ds>/packages/tokens/dist/m3.css" />
  <script type="module">
    import '@material/web/button/filled-button.js';
    import '@material/web/card/elevated-card.js';
    import '@material/web/textfield/outlined-text-field.js';
  </script>
</head>
<body style="background: var(--md-sys-color-background); color: var(--md-sys-color-on-background); padding: 24px;">
  <h2>M3 Smoke Fixture</h2>
  <md-filled-button>Primary Action</md-filled-button>
  <md-elevated-card style="padding: 16px; margin: 16px 0;">Card themed via Lifegames</md-elevated-card>
  <md-outlined-text-field label="Name" placeholder="Enter name"></md-outlined-text-field>
</body>
</html>
HTML

# 3. Open in browser and take screenshot
# Replace <path-to-ds> with actual DS repo path

# 4. Save screenshot as:
# apps/docs/public/integration-evidence/material3-mwc-2026-05-26.png
```

## Expected output

- `md-filled-button` should render with `--md-sys-color-primary` (#818cf8 indigo) background
- `md-elevated-card` should use `--md-sys-color-surface` (#06060f dark background)
- `md-outlined-text-field` outline should use `--md-sys-color-outline` (rgba(255,255,255,0.06))

## What was verified instead

- `m3.css` built successfully with 30 color roles, 8 fixed-tone vars, 4 state-layer tokens
- All aliases resolved to correct hex/rgba values (verified via `cat packages/tokens/dist/m3.css`)
- Build script `scripts/build-m3.mjs` runs clean with exit 0
- `emitPlatform` helper correctly resolves `{color.accent.indigo}` → `#818cf8` etc.

## Follow-up

Replace this file with an actual screenshot once manual verification is complete.

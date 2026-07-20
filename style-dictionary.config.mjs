// Style Dictionary v5 build driver for Lifegames Design System.
//
// Architecture:
//   - StyleDictionary v5 (5.4.x) is the engine. We instantiate it, register
//     custom formats, declare three platforms (web/css, ios/xcassets, ios/swift),
//     and call buildAllPlatforms() to orchestrate output emission.
//   - DTCG token loading still uses our group-$type-aware flattener because
//     SD v5's stock DTCG parser does not propagate $type inheritance from group
//     nodes down to leaf tokens. This remains necessary until a future SD
//     version ships native group-$type inheritance.
//   - Each emitter is registered as a custom SD format. SD orchestrates write
//     order, deterministic build hashing, and the file output API.
//   - All build artifacts are gated by golden file tests
//     (packages/tokens/__tests__/build-output.spec.ts).
//
// Format audit (SD v5.4 — 2026-06-06):
//   16 custom formats registered. SD v5 built-in formats (css/variables,
//   javascript/module, json/nested, ios-swift/enum.swift, etc.) cannot
//   replace any of them because:
//
//   RETAINED (product-specific shape SD doesn't model):
//     1. tokens.css — fluid clamp() spacing, composite typography shorthand,
//        shadow multi-layer, reduced-motion @media block, custom --lg- prefix
//     2. tokens-layered.css — @layer wrapper around tokens.css
//     3. tokens.js — flat resolved tree (SD's js/module adds wrapper)
//     4. tokens.json — flat resolved tree
//     5. DESIGN.md — rich markdown documentation with widget catalog
//     6. shadcn.css — OKLCH conversion via culori + shadcn alias mapping
//     7. deprecated-tokens.json — deprecation metadata extraction
//     8. tokens.dtcg.json — normalised DTCG output for conformance tooling
//     9. build-report.json — per-build provenance (sizes, file list)
//    10. xcassets-root — sidecar-writes N colorset dirs (SD writes one file)
//    11. Color+Tokens.swift — LGColor enum with asset catalog references
//    12. Spacing.swift — CGFloat enum with numeric extraction
//    13. Font+Tokens.swift — Font.custom with relativeTo + $extensions
//    14. Shadow+Tokens.swift — ViewModifier structs with multi-layer shadows
//    15. ReducedMotion.swift — static utility enum (no token data)
//    16. AISurfaces.swift — filtered color subset for AI client surfaces
//
//   DEFERRED (require future SD native DTCG group-$type inheritance):
//     - flattenTokens() / resolveAllTokens() custom loader
//     - Potential replacement of tokens.css color section with css/variables
//       (blocked by custom --lg- prefix and fluid spacing interleaving)

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { formatCss, converter } from 'culori';
import StyleDictionary from 'style-dictionary';
import { emitPlatform } from './scripts/emit-platform.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// --- Token Loading (custom — preserves group-$type inheritance) ---

function findTokenFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...findTokenFiles(full));
    } else if (entry.endsWith('.tokens.json')) {
      results.push(full);
    }
  }
  return results;
}

// Composite $value types whose internals must NOT be recursively flattened.
const COMPOSITE_TYPES = new Set([
  'shadow',
  'typography',
  'transition',
  'gradient',
  'border',
  'strokeStyle',
]);

function flattenTokens(obj, path = [], type = null) {
  const tokens = [];
  const currentType = obj.$type || type;
  for (const [key, val] of Object.entries(obj)) {
    if (key.startsWith('$')) continue;
    if (val && typeof val === 'object' && '$value' in val) {
      const tokenType = val.$type || currentType;
      tokens.push({
        path: [...path, key],
        $type: tokenType,
        $value: val.$value,
        $description: val.$description,
        $deprecated: val.$deprecated,
      });
    } else if (val && typeof val === 'object' && !Array.isArray(val)) {
      tokens.push(...flattenTokens(val, [...path, key], currentType));
    }
  }
  return tokens;
}

function loadAllTokens() {
  const tokenDir = resolve(__dirname, 'tokens');
  const files = findTokenFiles(tokenDir);
  const allTokens = [];
  for (const file of files) {
    const json = JSON.parse(readFileSync(file, 'utf-8'));
    allTokens.push(...flattenTokens(json));
  }
  return allTokens;
}

function resolveReference(ref, tokenMap) {
  if (typeof ref !== 'string' || !ref.startsWith('{') || !ref.endsWith('}')) return ref;
  const path = ref.slice(1, -1);
  const resolved = tokenMap.get(path);
  if (!resolved) return ref;
  if (typeof resolved.$value === 'string' && resolved.$value.startsWith('{')) {
    return resolveReference(resolved.$value, tokenMap);
  }
  return resolved.$value;
}

function resolveAllTokens(tokens) {
  const tokenMap = new Map();
  for (const t of tokens) tokenMap.set(t.path.join('.'), t);

  function resolveDeep(val) {
    if (typeof val === 'string' && val.startsWith('{') && val.endsWith('}')) {
      return resolveReference(val, tokenMap);
    }
    if (Array.isArray(val)) return val.map(resolveDeep);
    if (val && typeof val === 'object') {
      const out = {};
      for (const [k, v] of Object.entries(val)) out[k] = resolveDeep(v);
      return out;
    }
    return val;
  }

  const resolved = [];
  for (const t of tokens) {
    resolved.push({ ...t, resolvedValue: resolveDeep(t.$value) });
  }
  return resolved;
}

// --- Fluid values from web source ---

const FLUID_SPACING = {
  50: 'clamp(1px, 0.02rem + 0.13vw, 2px)',
  100: 'clamp(3px, 0.14rem + 0.13vw, 4px)',
  150: 'clamp(4px, 0.16rem + 0.25vw, 6px)',
  200: 'clamp(6px, 0.28rem + 0.25vw, 8px)',
  250: 'clamp(7px, 0.30rem + 0.38vw, 10px)',
  300: 'clamp(8px, 0.31rem + 0.50vw, 12px)',
  350: 'clamp(10px, 0.44rem + 0.50vw, 14px)',
  400: 'clamp(11px, 0.45rem + 0.63vw, 16px)',
  450: 'clamp(12px, 0.47rem + 0.75vw, 18px)',
  500: 'clamp(14px, 0.59rem + 0.75vw, 20px)',
  600: 'clamp(16px, 0.63rem + 1.00vw, 24px)',
  700: 'clamp(18px, 0.66rem + 1.25vw, 28px)',
  800: 'clamp(22px, 0.91rem + 1.25vw, 32px)',
  900: 'clamp(24px, 0.94rem + 1.50vw, 36px)',
  1000: 'clamp(28px, 1.19rem + 1.50vw, 40px)',
  1200: 'clamp(32px, 1.25rem + 2.00vw, 48px)',
};

const FLUID_TYPOGRAPHY = {
  caption2: 'clamp(0.625rem, 0.58rem + 0.12vw, 0.72rem)',
  caption: 'clamp(0.7rem, 0.64rem + 0.14vw, 0.78rem)',
  footnote: 'clamp(0.72rem, 0.65rem + 0.20vw, 0.82rem)',
  body: 'clamp(0.72rem, 0.65rem + 0.20vw, 0.82rem)',
  callout: 'clamp(0.72rem, 0.65rem + 0.20vw, 0.82rem)',
  subhead: 'clamp(0.88rem, 0.75rem + 0.34vw, 1.05rem)',
  headline: 'clamp(1.20rem, 0.98rem + 0.60vw, 1.50rem)',
  title3: 'clamp(1.60rem, 1.30rem + 0.80vw, 2.00rem)',
  title2: 'clamp(1.90rem, 1.53rem + 1.00vw, 2.40rem)',
  title1: 'clamp(2.10rem, 1.70rem + 1.05vw, 2.625rem)',
  hero: 'clamp(1.80rem, 1.50rem + 0.80vw, 2.20rem)',
};

const IOS_TEXT_STYLE = {
  caption2: '.caption2',
  caption: '.caption',
  footnote: '.footnote',
  body: '.body',
  callout: '.callout',
  subhead: '.subheadline',
  headline: '.headline',
  title3: '.title3',
  title2: '.title2',
  title1: '.title',
  hero: '.largeTitle',
};

const SWIFT_FONT_WEIGHT = {
  300: 'Light',
  400: 'Regular',
  500: 'Medium',
  600: 'SemiBold',
  700: 'Bold',
};

// --- Helpers ---

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16) / 255.0,
    g: parseInt(h.substring(2, 4), 16) / 255.0,
    b: parseInt(h.substring(4, 6), 16) / 255.0,
  };
}

function hexToSwiftColor(hex) {
  const { r, g, b } = hexToRgb(hex);
  return `Color(red: ${r.toFixed(3)}, green: ${g.toFixed(3)}, blue: ${b.toFixed(3)})`;
}

function rgbaToSwiftColor(rgba) {
  const match = rgba.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,?\s*([\d.]+)?\s*\)/);
  if (!match) return null;
  const r = parseInt(match[1]) / 255.0;
  const g = parseInt(match[2]) / 255.0;
  const b = parseInt(match[3]) / 255.0;
  const a = match[4] !== undefined ? parseFloat(match[4]) : 1.0;
  if (a === 1.0)
    return `Color(red: ${r.toFixed(3)}, green: ${g.toFixed(3)}, blue: ${b.toFixed(3)})`;
  return `Color(red: ${r.toFixed(3)}, green: ${g.toFixed(3)}, blue: ${b.toFixed(3)}, opacity: ${a})`;
}

function toCamelCase(path) {
  return path
    .map((p, i) => {
      const clean = p.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
      return i === 0 ? clean : clean.charAt(0).toUpperCase() + clean.slice(1);
    })
    .join('');
}

function toCssVar(path) {
  return '--lg-' + path.join('-');
}

// --- Token loading + dir setup (shared across formats) ---

const raw = loadAllTokens();
const tokens = resolveAllTokens(raw);

const distDir = resolve(__dirname, 'packages/tokens/dist');
const swiftDir = resolve(__dirname, 'Sources/LifegamesTokens');
const xcassetsDir = resolve(__dirname, 'Sources/LifegamesTokens/Resources/Colors.xcassets');
mkdirSync(distDir, { recursive: true });
mkdirSync(xcassetsDir, { recursive: true });

// --- Emit functions (each returns a string; registered as SD v5 custom formats) ---

function emitTokensCss() {
  let css = '/* Generated by Style Dictionary — do not edit */\n:root {\n';

  css += '  /* Colors */\n';
  for (const t of tokens) {
    if (t.$type !== 'color') continue;
    css += `  ${toCssVar(t.path)}: ${t.resolvedValue};\n`;
  }

  css += '\n  /* Spacing (fluid) */\n';
  for (const t of tokens) {
    if (t.$type !== 'dimension' || t.path[0] !== 'space') continue;
    const key = t.path[t.path.length - 1];
    const fluid = FLUID_SPACING[key];
    css += `  ${toCssVar(t.path)}: ${fluid || t.resolvedValue};\n`;
  }

  css += '\n  /* Component tokens */\n';
  for (const t of tokens) {
    if (t.path[0] !== 'card') continue;
    const val = t.resolvedValue;
    if (typeof val === 'string' && val.match(/^\d+px$/)) {
      const spaceKey = Object.entries(FLUID_SPACING).find(([, v]) => {
        const max = v.match(/,\s*(\d+)px\)$/);
        return max && max[1] + 'px' === val;
      });
      css += `  ${toCssVar(t.path)}: ${spaceKey ? FLUID_SPACING[spaceKey[0]] : val};\n`;
    } else {
      css += `  ${toCssVar(t.path)}: ${val};\n`;
    }
  }

  css += '\n  /* Typography (fluid) */\n';
  const emittedFluidFontSizes = new Set();
  for (const t of tokens) {
    if (t.$type !== 'typography') continue;
    const name = t.path[t.path.length - 1];
    const fluid = FLUID_TYPOGRAPHY[name];
    if (fluid && !emittedFluidFontSizes.has(name)) {
      css += `  --lg-font-size-${name}: ${fluid};\n`;
      emittedFluidFontSizes.add(name);
    }
  }

  // A font-family value that already contains a comma is a full, author-managed
  // stack (its own generic fallback included) and is emitted verbatim; a bare
  // single family name is quoted and gets the sans-serif generic. This lets the
  // mono family carry its own `..., monospace` fallback instead of a wrong
  // sans-serif one, without changing any single-name family token.
  const cssFontFamily = (value) =>
    String(value).includes(',') ? String(value) : `'${value}', sans-serif`;

  css += '\n  /* Font families */\n';
  for (const t of tokens) {
    if (t.$type !== 'fontFamily') continue;
    css += `  ${toCssVar(t.path)}: ${cssFontFamily(t.resolvedValue)};\n`;
  }

  css += '\n  /* Font weights */\n';
  for (const t of tokens) {
    if (t.$type !== 'fontWeight') continue;
    css += `  ${toCssVar(t.path)}: ${t.resolvedValue};\n`;
  }

  css += '\n  /* Motion */\n';
  for (const t of tokens) {
    if (t.$type === 'duration') css += `  ${toCssVar(t.path)}: ${t.resolvedValue};\n`;
  }
  for (const t of tokens) {
    if (t.$type !== 'cubicBezier') continue;
    const val = t.resolvedValue;
    if (Array.isArray(val)) css += `  ${toCssVar(t.path)}: cubic-bezier(${val.join(', ')});\n`;
  }

  css += '\n  /* Shadows */\n';
  for (const t of tokens) {
    if (t.$type !== 'shadow') continue;
    const val = t.resolvedValue;
    if (!val) continue;
    const layers = Array.isArray(val) ? val : [val];
    const cssShadow = layers
      .map(
        (l) =>
          `${l.offsetX || 0}px ${l.offsetY || 0}px ${l.blur || 0}px ${l.spread || 0}px ${l.color}`,
      )
      .join(', ');
    css += `  ${toCssVar(t.path)}: ${cssShadow};\n`;
  }

  css += '\n  /* Composite typography shorthand + per-property vars */\n';
  for (const t of tokens) {
    if (t.$type !== 'typography') continue;
    const val = t.resolvedValue;
    if (!val || typeof val !== 'object') continue;
    const prefix = `  --lg-${t.path.join('-')}`;
    if (val.fontSize) css += `${prefix}-font-size: ${val.fontSize};\n`;
    if (val.fontWeight !== undefined) css += `${prefix}-font-weight: ${val.fontWeight};\n`;
    if (val.lineHeight !== undefined) css += `${prefix}-line-height: ${val.lineHeight};\n`;
    if (val.fontFamily) {
      const resolvedFamily = resolveReference(
        val.fontFamily,
        new Map(tokens.map((t) => [t.path.join('.'), t])),
      );
      css += `${prefix}-font-family: ${cssFontFamily(resolvedFamily)};\n`;
    }
    if (val.letterSpacing) css += `${prefix}-letter-spacing: ${val.letterSpacing};\n`;
  }

  css += '\n  /* Transition composite vars */\n';
  function easingToCss(ease) {
    if (Array.isArray(ease) && ease.length === 4) {
      return `cubic-bezier(${ease.join(', ')})`;
    }
    return ease ?? '';
  }
  for (const t of tokens) {
    if (t.$type !== 'transition') continue;
    const val = t.resolvedValue;
    if (!val || typeof val !== 'object') continue;
    const prefix = `  --lg-${t.path.join('-')}`;
    const dur = val.duration ?? '';
    const ease = easingToCss(val.timingFunction);
    const delay = val.delay ?? '0ms';
    css += `${prefix}: ${dur} ${ease} ${delay};\n`;
  }

  css += '\n  /* Border radius */\n';
  css += '  --lg-radius-sm: 2px;\n';
  css += '  --lg-radius-md: 8px;\n';
  css += '  --lg-radius-lg: clamp(12px, 0.50rem + 0.50vw, 16px);\n';
  css += '  --lg-radius-xl: clamp(14px, 0.56rem + 0.75vw, 20px);\n';
  css += '  --lg-radius-pill: 50px;\n';
  css += '  --lg-radius-circle: 50%;\n';
  css += '\n  /* Blur */\n';
  css += '  --lg-blur-sm: 8px;\n';
  css += '  --lg-blur-md: 16px;\n';
  css += '  --lg-blur-lg: 24px;\n';
  css += '  --lg-blur-xl: 32px;\n';

  // Z-index scale — named stacking levels (path[0] === 'z'). Filtered by path,
  // not $type, so the numeric literals emit verbatim (e.g. `--lg-z-raised: 1`).
  css += '\n  /* Z-index scale */\n';
  for (const t of tokens) {
    if (t.path[0] !== 'z') continue;
    css += `  ${toCssVar(t.path)}: ${t.resolvedValue};\n`;
  }

  // Line-height scale — unitless multipliers (path[0] === 'line-height').
  css += '\n  /* Line heights */\n';
  for (const t of tokens) {
    if (t.path[0] !== 'line-height') continue;
    css += `  ${toCssVar(t.path)}: ${t.resolvedValue};\n`;
  }

  css += '}\n';

  css += '\n@media (prefers-reduced-motion: reduce) {\n  :root {\n';
  for (const t of tokens) {
    if (t.$type === 'duration' && !t.path.includes('reduced')) {
      css += `    ${toCssVar(t.path)}: 0ms;\n`;
    }
  }
  for (const t of tokens) {
    if (t.$type === 'cubicBezier' && !t.path.includes('reduced')) {
      css += `    ${toCssVar(t.path)}: linear;\n`;
    }
  }
  css += '  }\n}\n';

  return css;
}

function emitTokensCssLayered(css) {
  return `@layer lifegames { @layer tokens {\n${css.trimEnd()}\n} }\n`;
}

function buildJsonTokens() {
  const jsonTokens = {};
  for (const t of tokens) {
    let obj = jsonTokens;
    for (let i = 0; i < t.path.length - 1; i++) {
      if (!obj[t.path[i]]) obj[t.path[i]] = {};
      obj = obj[t.path[i]];
    }
    obj[t.path[t.path.length - 1]] = t.resolvedValue;
  }
  return jsonTokens;
}

function emitTokensJs(jsonTokens) {
  return (
    '// Generated by Style Dictionary — do not edit\nexport default ' +
    JSON.stringify(jsonTokens, null, 2) +
    ';\n'
  );
}

function emitTokensJson(jsonTokens) {
  return JSON.stringify(jsonTokens, null, 2) + '\n';
}

// xcassets: writes 1 root Contents.json + N colorset/Contents.json files.
// SD's file API delivers one output per format; we sidecar-write the colorsets
// and return the root Contents.json as the SD format output.

function hexToXcassetsComponents(hex) {
  const h = hex.replace('#', '');
  return {
    red: (parseInt(h.substring(0, 2), 16) / 255.0).toFixed(10),
    green: (parseInt(h.substring(2, 4), 16) / 255.0).toFixed(10),
    blue: (parseInt(h.substring(4, 6), 16) / 255.0).toFixed(10),
    alpha: '1.000000000',
  };
}

function rgbaToXcassetsComponents(rgba) {
  const match = rgba.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,?\s*([\d.]+)?\s*\)/);
  if (!match) return null;
  return {
    red: (parseInt(match[1]) / 255.0).toFixed(10),
    green: (parseInt(match[2]) / 255.0).toFixed(10),
    blue: (parseInt(match[3]) / 255.0).toFixed(10),
    alpha: match[4] !== undefined ? parseFloat(match[4]).toFixed(9) : '1.000000000',
  };
}

function colorsetContents(components) {
  return (
    JSON.stringify(
      {
        colors: [
          {
            color: {
              'color-space': 'srgb',
              components: {
                red: components.red,
                green: components.green,
                blue: components.blue,
                alpha: components.alpha,
              },
            },
            idiom: 'universal',
          },
        ],
        info: { author: 'style-dictionary', version: 1 },
      },
      null,
      2,
    ) + '\n'
  );
}

const xcassetsColorNames = [];

function emitXcassetsColorsets() {
  xcassetsColorNames.length = 0;
  for (const t of tokens) {
    if (t.$type !== 'color') continue;
    const val = t.resolvedValue;
    let components = null;
    if (typeof val === 'string' && val.startsWith('#')) {
      components = hexToXcassetsComponents(val);
    } else if (typeof val === 'string' && (val.startsWith('rgba') || val.startsWith('rgb'))) {
      components = rgbaToXcassetsComponents(val);
    }
    if (!components) continue;
    const assetName = t.path
      .map((seg) =>
        seg
          .replace(/([A-Z])/g, '-$1')
          .toLowerCase()
          .replace(/^-/, ''),
      )
      .join('-');
    const colorsetDir = resolve(xcassetsDir, `${assetName}.colorset`);
    mkdirSync(colorsetDir, { recursive: true });
    writeFileSync(resolve(colorsetDir, 'Contents.json'), colorsetContents(components));
    xcassetsColorNames.push({ name: assetName, camel: toCamelCase(t.path) });
  }
  return JSON.stringify({ info: { author: 'style-dictionary', version: 1 } }, null, 2) + '\n';
}

function emitColorTokensSwift() {
  let swiftColors = '// Generated by Style Dictionary — do not edit\nimport SwiftUI\n\n';
  swiftColors += '/// Token-backed color constants resolved from the asset catalog.\n';
  swiftColors += '/// Use `LGColor.accentPink` (etc.) in new code.\n';
  swiftColors +=
    '/// Legacy `Color.colorAccentPink` aliases live in `_Legacy/` during transition.\n';
  swiftColors += 'public enum LGColor {\n';
  for (const { name, camel } of xcassetsColorNames) {
    const shortCamel = camel.startsWith('color')
      ? camel.charAt(5).toLowerCase() + camel.slice(6)
      : camel;
    swiftColors += `    public static let ${shortCamel} = Color("${name}", bundle: .module)\n`;
  }
  swiftColors += '}\n';
  return swiftColors;
}

function emitSpacingSwift() {
  let swiftSpacing =
    '// Generated by Style Dictionary — do not edit\nimport CoreGraphics\n\npublic enum Spacing {\n';
  for (const t of tokens) {
    if (t.$type !== 'dimension' || t.path[0] !== 'space') continue;
    const key = t.path[t.path.length - 1];
    const val = t.resolvedValue;
    const num = parseFloat(String(val));
    if (!isNaN(num)) swiftSpacing += `    public static let s${key}: CGFloat = ${num}\n`;
  }
  swiftSpacing += '}\n';
  return swiftSpacing;
}

function emitFontTokensSwift() {
  let swiftFonts =
    '// Generated by Style Dictionary — do not edit\nimport SwiftUI\n\npublic extension Font {\n    enum Tokens {\n';
  const seenFontNames = new Set();
  for (const t of tokens) {
    if (t.$type !== 'typography') continue;
    const name = t.path[t.path.length - 1];
    if (seenFontNames.has(name)) continue;
    const val = t.resolvedValue;
    if (!val || typeof val !== 'object') continue;
    seenFontNames.add(name);
    // iOS-specific scale data lives in $extensions.lifegames per DTCG convention.
    // Primitive iOS typography tokens carry the canonical size in $value.fontSize
    // (DTCG-standard); legacy fontSizeMax and $extensions.lifegames.fontSizeMax
    // are accepted as fallbacks during the native-transform migration window.
    const lgExt = (t.$extensions && t.$extensions.lifegames) || {};
    // val.fontSize may be a number (iOS primitive) or a CSS clamp() string
    // (semantic web token). Only numeric sizes are valid in SwiftUI Font.custom.
    const numericFontSize = typeof val.fontSize === 'number' ? val.fontSize : null;
    const size = lgExt.fontSizeMax || val.fontSizeMax || numericFontSize || 17;
    const weight = SWIFT_FONT_WEIGHT[val.fontWeight] || 'Regular';
    const textStyle = lgExt.iosTextStyle || IOS_TEXT_STYLE[name] || '.body';
    swiftFonts += `        public static func ${name}() -> Font {\n`;
    swiftFonts += `            .custom("SpaceGrotesk-${weight}", size: ${size}, relativeTo: ${textStyle})\n`;
    swiftFonts += `        }\n`;
  }
  swiftFonts += '    }\n}\n';
  return swiftFonts;
}

function emitShadowTokensSwift() {
  const shadowTokens = tokens.filter((t) => t.$type === 'shadow');
  let swiftShadows = '// Generated by Style Dictionary — do not edit\nimport SwiftUI\n\n';
  swiftShadows += 'public enum ShadowTokens {\n';
  for (const t of shadowTokens) {
    const name = toCamelCase(t.path);
    swiftShadows += `    public static func ${name}() -> _ShadowModifier_${name} { _ShadowModifier_${name}() }\n`;
  }
  swiftShadows += '}\n\n';
  for (const t of shadowTokens) {
    const name = toCamelCase(t.path);
    const val = t.resolvedValue;
    if (!val) continue;
    const layers = Array.isArray(val) ? val : [val];
    swiftShadows += `public struct _ShadowModifier_${name}: ViewModifier {\n`;
    swiftShadows += `    public func body(content: Content) -> some View {\n`;
    swiftShadows += `        content\n`;
    for (const layer of layers) {
      const swift = rgbaToSwiftColor(layer.color);
      const radius = (layer.blur || 0) / 2;
      if (swift)
        swiftShadows += `            .shadow(color: ${swift}, radius: ${radius}, x: ${layer.offsetX || 0}, y: ${layer.offsetY || 0})\n`;
    }
    swiftShadows += `    }\n}\n\n`;
  }
  return swiftShadows;
}

function emitReducedMotionSwift() {
  let rm = '// Generated by Style Dictionary — do not edit\nimport SwiftUI\n\n';
  rm += '/// Reduced-motion variants for all duration and easing tokens.\n';
  rm += '/// Use `ReducedMotion.duration` and `ReducedMotion.easing` in views that respect\n';
  rm += '/// the system accessibility setting `UIAccessibility.isReduceMotionEnabled`.\n';
  rm += 'public enum ReducedMotion {\n';
  rm += '    public enum Duration {\n';
  rm += '        public static let all: Double = 0.0\n';
  rm += '    }\n';
  rm += '    public enum Easing {\n';
  rm += '        public static let linear: Animation = .linear(duration: 0)\n';
  rm += '    }\n';
  rm += '    /// Returns 0 if reduce-motion is enabled, otherwise returns the provided duration.\n';
  rm += '    @MainActor\n';
  rm += '    public static func duration(_ full: Double) -> Double {\n';
  rm += '        #if os(iOS) || os(tvOS)\n';
  rm += '        return UIAccessibility.isReduceMotionEnabled ? 0.0 : full\n';
  rm += '        #else\n';
  rm += '        return full\n';
  rm += '        #endif\n';
  rm += '    }\n';
  rm +=
    '    /// Returns `.linear(duration: 0)` if reduce-motion is enabled, otherwise returns provided animation.\n';
  rm += '    @MainActor\n';
  rm += '    public static func animation(_ full: Animation) -> Animation {\n';
  rm += '        #if os(iOS) || os(tvOS)\n';
  rm += '        return UIAccessibility.isReduceMotionEnabled ? .linear(duration: 0) : full\n';
  rm += '        #else\n';
  rm += '        return full\n';
  rm += '        #endif\n';
  rm += '    }\n';
  rm += '}\n';
  return rm;
}

function emitAISurfacesSwift() {
  let ai = '// Generated by Style Dictionary — do not edit\nimport SwiftUI\n\n';
  ai += '/// Color tokens for surfaces rendered by AI clients (thinking indicators,\n';
  ai += '/// citations, tool-use disclosure, artifact frames, code blocks).\n';
  ai += 'public enum AISurfaces {\n';
  const aiSurfaceTokens = tokens.filter(
    (t) =>
      t.$type === 'color' &&
      t.path[0] === 'color' &&
      t.path[1] === 'surface' &&
      ['thinking', 'citation', 'tool-use', 'artifact-frame', 'code-block', 'code-block-diff'].some(
        (s) => t.path.includes(s),
      ),
  );
  for (const t of aiSurfaceTokens) {
    const name = toCamelCase(t.path.slice(1));
    const val = t.resolvedValue;
    if (!val) continue;
    if (typeof val === 'string' && val.startsWith('#')) {
      ai += `    public static let ${name} = ${hexToSwiftColor(val)}\n`;
    } else if (typeof val === 'string' && (val.startsWith('rgba') || val.startsWith('rgb'))) {
      const swift = rgbaToSwiftColor(val);
      if (swift) ai += `    public static let ${name} = ${swift}\n`;
    }
  }
  ai += '}\n';
  return ai;
}

function emitDesignMd() {
  function tokensOfType(type) {
    return tokens.filter((t) => t.$type === type);
  }
  function tokensUnderPath(prefix) {
    return tokens.filter((t) => t.path[0] === prefix);
  }
  function fmtRef(t) {
    return t.path.join('.');
  }
  function fmtValue(v) {
    if (v === undefined || v === null) return '';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  }

  let md = '';
  md += '# Lifegames Design System\n\n';
  md += '> Generated from `tokens/*.tokens.json` — do not edit by hand.\n';
  md += '> Re-upload to claude.ai/design after every meaningful token change.\n\n';
  md += '## Brand & Voice\n\n';
  // Voice content is sourced from the committed packages/copy/voice.summary.json
  // (source of truth: packages/copy/VOICE.md). Hand-authored + committed, NOT a
  // build output, so reading it here adds no build-order edge (build:tokens has
  // no dependsOn). If it ever becomes generated, add a build:tokens ->
  // @lifegames/copy#build edge in turbo.json.
  const voice = JSON.parse(
    readFileSync(resolve(__dirname, 'packages/copy/voice.summary.json'), 'utf-8'),
  );
  md +=
    '_Voice source of truth: `packages/copy/VOICE.md` — this section is generated from `packages/copy/voice.summary.json`._\n\n';
  md += `**${voice.adjectives.join(' · ')}.** ${voice.spine}\n\n`;
  md +=
    'Visual language: dark-first, neon-accented, cross-platform (web Astro + iOS SwiftUI) — deep near-black surfaces, glassy translucent cards, vivid neon accents (pink, indigo, cyan), fluid typography that scales with viewport, and motion that favors decelerated easing.\n\n';
  md += `**Registers** (the \`register\` enum): ${voice.registers.map((r) => `\`${r.name}\``).join(', ')}.\n\n`;
  md += `**Audiences** (the \`audience\` field): ${voice.audiences.map((a) => `\`${a.name}\``).join(', ')}.\n\n`;
  md += `**Arbitration rule:** ${voice.arbitrationRule}\n\n`;
  md += `**Principles:** ${voice.principles.map((p) => p.replace(/\.$/, '')).join('; ')}.\n\n`;
  md += '## Token Architecture\n\n';
  md += 'Four tiers, applied in order of specificity:\n\n';
  md +=
    '1. **Primitive** — raw values (`color.pink.500 = #ff006e`). Never reference these directly from components.\n';
  md +=
    '2. **Semantic** — role-based aliases (`color.accent.pink → {color.pink.500}`). The consumer-facing layer.\n';
  md += '3. **Component** — component-scoped overrides (`card.background`).\n';
  md += '4. **Widget** — widget-scoped overrides (optional tier).\n\n';
  md +=
    '**Rule:** Token names encode ROLE, not value. Use `color.accent.pink`, never `color.ff006e`.\n\n';
  md += '## Color Palette\n\n';
  md += '### Primitive colors\n\n';
  md += '| Token | Value |\n|---|---|\n';
  for (const t of tokensOfType('color')) {
    if (t.path[0] !== 'color') continue;
    if (t.path.length < 2) continue;
    if (
      t.path[1] === 'surface' ||
      t.path[1] === 'border' ||
      t.path[1] === 'text' ||
      t.path[1] === 'accent' ||
      t.path[1] === 'accent-hc' ||
      t.path[1] === 'health' ||
      t.path[1] === 'interactive' ||
      t.path[1] === 'status' ||
      t.path[1] === 'overlay'
    )
      continue;
    md += `| \`${fmtRef(t)}\` | \`${fmtValue(t.resolvedValue)}\` |\n`;
  }
  md += '\n';
  md += '### Semantic roles\n\n';
  const semanticGroups = [
    'surface',
    'border',
    'text',
    'accent',
    'accent-hc',
    'health',
    'interactive',
    'status',
    'overlay',
  ];
  for (const group of semanticGroups) {
    const groupTokens = tokens.filter(
      (t) => t.$type === 'color' && t.path[0] === 'color' && t.path[1] === group,
    );
    if (groupTokens.length === 0) continue;
    md += `#### color.${group}\n\n`;
    md += '| Token | Resolves to | Description |\n|---|---|---|\n';
    for (const t of groupTokens) {
      const desc = t.$description ? t.$description.replace(/\|/g, '\\|').replace(/\n/g, ' ') : '';
      md += `| \`${fmtRef(t)}\` | \`${fmtValue(t.resolvedValue)}\` | ${desc} |\n`;
    }
    md += '\n';
  }
  md += '## Typography\n\n';
  md +=
    'Fluid type scale via `clamp()` on web; SwiftUI `Font.custom(..., relativeTo:)` on iOS for Dynamic Type. ';
  md +=
    'Font family: **Space Grotesk** (PostScript names: `SpaceGrotesk-Regular`, `-Medium`, `-SemiBold`, `-Bold`, `-Light`).\n\n';
  md += '| Style | Fluid size (web) | iOS text style | Weight |\n|---|---|---|---|\n';
  for (const t of tokensOfType('typography')) {
    const name = t.path[t.path.length - 1];
    const val = t.resolvedValue;
    if (!val || typeof val !== 'object') continue;
    const fluid = FLUID_TYPOGRAPHY[name] || '';
    const iosStyle = IOS_TEXT_STYLE[name] || '';
    const weight = SWIFT_FONT_WEIGHT[val.fontWeight] || 'Regular';
    md += `| \`${name}\` | \`${fluid}\` | \`${iosStyle}\` | ${weight} (${val.fontWeight || 400}) |\n`;
  }
  md += '\n';
  md += '## Spacing\n\n';
  md += 'Fluid spacing scale. Web uses `clamp()`; iOS uses the max pixel value as `CGFloat`.\n\n';
  md += '| Token | Web (fluid) | iOS (CGFloat) |\n|---|---|---|\n';
  for (const t of tokensOfType('dimension')) {
    if (t.path[0] !== 'space') continue;
    const key = t.path[t.path.length - 1];
    const fluid = FLUID_SPACING[key] || fmtValue(t.resolvedValue);
    md += `| \`${fmtRef(t)}\` | \`${fluid}\` | \`${fmtValue(t.resolvedValue)}\` |\n`;
  }
  md += '\n';
  md += '## Motion\n\n';
  md += '### Duration\n\n| Token | Value |\n|---|---|\n';
  for (const t of tokensOfType('duration')) {
    md += `| \`${fmtRef(t)}\` | \`${fmtValue(t.resolvedValue)}\` |\n`;
  }
  md += '\n### Easing (cubic-bezier)\n\n| Token | Curve |\n|---|---|\n';
  for (const t of tokensOfType('cubicBezier')) {
    const v = t.resolvedValue;
    const curve = Array.isArray(v) ? `cubic-bezier(${v.join(', ')})` : fmtValue(v);
    md += `| \`${fmtRef(t)}\` | \`${curve}\` |\n`;
  }
  md +=
    '\n**Default behavior:** prefer `standard` for most transitions, `decelerate` for entering elements, `overshoot` for playful affordances.\n\n';
  md += '## Shadows\n\n';
  md += '| Token | Layers |\n|---|---|\n';
  for (const t of tokensOfType('shadow')) {
    const v = t.resolvedValue;
    if (!v) continue;
    const layers = Array.isArray(v) ? v : [v];
    const summary = layers
      .map(
        (l) =>
          `${l.offsetX || 0}px ${l.offsetY || 0}px ${l.blur || 0}px ${l.spread || 0}px ${l.color}`,
      )
      .join(' / ');
    md += `| \`${fmtRef(t)}\` | \`${summary}\` |\n`;
  }
  md += '\n';
  md += '## Component Tokens\n\n';
  const componentRoots = new Set();
  for (const t of tokens) {
    if (
      ['color', 'space', 'motion', 'typography', 'iosTypography', 'shadow', 'font'].includes(
        t.path[0],
      )
    )
      continue;
    if (t.path[0]) componentRoots.add(t.path[0]);
  }
  for (const root of [...componentRoots].sort()) {
    md += `### ${root}\n\n| Token | Value |\n|---|---|\n`;
    for (const t of tokensUnderPath(root)) {
      md += `| \`${fmtRef(t)}\` | \`${fmtValue(t.resolvedValue)}\` |\n`;
    }
    md += '\n';
  }
  md += '## Widget Catalog\n\n';
  const manifestPath = resolve(
    __dirname,
    'Sources/LifegamesWidgets/Resources/widgets/widget-manifest.json',
  );
  if (existsSync(manifestPath)) {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    const byCategory = {};
    for (const w of manifest.widgets || []) {
      (byCategory[w.category] ||= []).push(w);
    }
    const categories = Object.keys(byCategory).sort();
    md += `Single-purpose UI surfaces sharing a common dark/neon aesthetic. ${manifest.widgets.length} widgets across ${categories.length} categories. Each widget consumes a JSON fixture and renders identically on web (Astro) and iOS (SwiftUI).\n\n`;
    for (const category of categories) {
      md += `### ${category}\n\n| Widget | View Type | Fixture | Production |\n|---|---|---|---|\n`;
      const sorted = [...byCategory[category]].sort((a, b) => a.name.localeCompare(b.name));
      for (const w of sorted) {
        const prod = w.production ? `yes (${w.productionCategory || 'unspecified'})` : 'no';
        md += `| \`${w.name}\` | \`${w.viewType}\` | \`${w.fixturePath}\` | ${prod} |\n`;
      }
      md += '\n';
    }
  }
  md += '## Authoring Rules\n\n';
  md += '- **No raw hex** in component or widget source files. Use semantic tokens.\n';
  md +=
    '- **No raw `Color(hex:)` or `Color(red:green:blue:)`** in Swift component files — use generated `LifegamesTokens` constants.\n';
  md += '- **No raw hex in CSS** — use `var(--lg-*)` custom properties from `@lifegames/tokens`.\n';
  md += '- All neon colors MUST resolve to **identical hex values** across web and iOS.\n';
  md += '- All SwiftUI `#Preview` blocks MUST include `.preferredColorScheme(.dark)`.\n';
  md +=
    '- Fluid typography and spacing via `clamp()` on web; SwiftUI uses `relativeTo:` for Dynamic Type on iOS.\n\n';
  md += '## CSS Custom Property Naming\n\n';
  md +=
    'All web-consumed tokens are exposed as CSS custom properties prefixed `--lg-`. Example: `color.accent.pink → var(--lg-color-accent-pink)`.\n\n';
  md += '## Source of Truth\n\n';
  md +=
    '- DTCG JSON: `tokens/*.tokens.json` in [design-system-Lifegames](https://github.com/) (canonical)\n';
  md += '- Build: `pnpm build:tokens`\n';
  md +=
    '- Outputs: `packages/tokens/dist/{tokens.css,tokens.js,tokens.json}`, `Sources/LifegamesTokens/*.swift`\n';
  md += '- This file: `packages/tokens/dist/DESIGN.md` — regenerated on every build.\n';
  return md;
}

function emitShadcnCss() {
  const toOklch = converter('oklch');
  function hexToOklch(hex) {
    try {
      const oklch = toOklch(hex);
      if (!oklch) return hex;
      const l = (oklch.l * 100).toFixed(2);
      const c = oklch.c.toFixed(4);
      const h = isNaN(oklch.h) ? '0' : oklch.h.toFixed(2);
      return `oklch(${l}% ${c} ${h})`;
    } catch {
      return hex;
    }
  }
  function valueToOklch(value) {
    if (typeof value !== 'string') return String(value ?? '');
    if (value.startsWith('#')) return hexToOklch(value);
    if (value.startsWith('rgba(') || value.startsWith('rgb(')) {
      try {
        const oklch = toOklch(value);
        if (!oklch) return value;
        const l = (oklch.l * 100).toFixed(2);
        const c = oklch.c.toFixed(4);
        const h = isNaN(oklch.h) ? '0' : oklch.h.toFixed(2);
        const a = oklch.alpha !== undefined && oklch.alpha < 1 ? ` / ${oklch.alpha}` : '';
        return `oklch(${l}% ${c} ${h}${a})`;
      } catch {
        return value;
      }
    }
    return value;
  }

  const shadcnAliasPath = resolve(__dirname, 'tokens/projections/shadcn/alias.json');
  const shadcnAlias = JSON.parse(readFileSync(shadcnAliasPath, 'utf-8'));
  const tokenMapForShadcn = new Map();
  for (const t of tokens) tokenMapForShadcn.set(t.path.join('.'), t);
  function resolveShadcnAlias(ref) {
    if (typeof ref !== 'string') return String(ref ?? '');
    if (ref.startsWith('{') && ref.endsWith('}')) {
      const path = ref.slice(1, -1);
      const t = tokenMapForShadcn.get(path);
      if (t) return t.resolvedValue ?? ref;
      return ref;
    }
    return ref;
  }

  let shadcnCss = '/* Generated by Style Dictionary — shadcn platform — do not edit */\n';
  shadcnCss += '/* shadcn/ui OKLCH compatible vars — import as globals.css layer */\n\n';
  shadcnCss += ':root {\n';
  for (const [role, ref] of Object.entries(shadcnAlias.light)) {
    if (role.startsWith('_')) continue;
    if (role === 'radius') {
      const radiusToken = tokenMapForShadcn.get('card.cornerRadius');
      const radiusVal = radiusToken ? radiusToken.resolvedValue : '16px';
      shadcnCss += `  --radius: ${radiusVal};\n`;
    } else {
      const resolved = resolveShadcnAlias(ref);
      shadcnCss += `  --${role}: ${valueToOklch(String(resolved))};\n`;
    }
  }
  for (const t of tokens) {
    if (
      t.path[0] === 'color' &&
      t.path[1] === 'surface' &&
      ['thinking', 'citation', 'tool-use', 'artifact-frame', 'code-block'].includes(t.path[2])
    ) {
      const varName = '--lg-' + t.path.join('-');
      shadcnCss += `  ${varName}: ${t.resolvedValue};\n`;
    }
  }
  shadcnCss += '}\n\n';
  shadcnCss += '.dark {\n';
  for (const [role, ref] of Object.entries(shadcnAlias.dark)) {
    if (role.startsWith('_')) continue;
    const resolved = resolveShadcnAlias(ref);
    shadcnCss += `  --${role}: ${valueToOklch(String(resolved))};\n`;
  }
  shadcnCss += '}\n';
  return shadcnCss;
}

function emitDeprecatedTokensJson() {
  const deprecatedTokens = tokens
    .filter((t) => t.$deprecated === true)
    .map((t) => ({
      path: t.path,
      cssVar: '--lg-' + t.path.join('-'),
      swiftName: toCamelCase(t.path),
    }));
  return JSON.stringify(deprecatedTokens, null, 2) + '\n';
}

// tokens.dtcg.json — normalised DTCG output for downstream conformance tooling.
// Emits the resolved token tree with $value and $type at every leaf, matching
// the W3C DTCG draft shape. scripts/validate-dtcg.mjs consumes this file when
// invoked with --report.
function emitTokensDtcgJson() {
  const tree = {};
  for (const t of tokens) {
    let obj = tree;
    for (let i = 0; i < t.path.length - 1; i++) {
      if (!obj[t.path[i]]) obj[t.path[i]] = {};
      obj = obj[t.path[i]];
    }
    const leaf = { $value: t.resolvedValue };
    if (t.$type) leaf.$type = t.$type;
    if (t.$description) leaf.$description = t.$description;
    if (t.$deprecated) leaf.$deprecated = t.$deprecated;
    obj[t.path[t.path.length - 1]] = leaf;
  }
  return JSON.stringify(tree, null, 2) + '\n';
}

// build-report.json — per-build provenance: token count, list of emitted files
// with sizes, total bytes, build timestamp. Consumed by CI for size budget
// guards and by the F-034 baseline-age policy script.
//
// builtAt is intentionally omitted from the emitted bytes to keep the file
// stable for golden-test byte comparison. CI consumers that need a timestamp
// can read fs.statSync(...).mtime on the file itself.
function emitBuildReportJson(emittedFilesAndSizes) {
  const totalBytes = emittedFilesAndSizes.reduce((sum, f) => sum + f.bytes, 0);
  return (
    JSON.stringify(
      {
        tokens: tokens.length,
        files: emittedFilesAndSizes.map((f) => ({ path: f.path, bytes: f.bytes })),
        totalBytes,
        engine: 'style-dictionary@5',
      },
      null,
      2,
    ) + '\n'
  );
}

// --- StyleDictionary v5 platform / format registration ---
//
// SD v5 is invoked as the build orchestrator. Order matters: emit xcassets
// BEFORE the Swift Color+Tokens format runs, because Color+Tokens depends on
// the xcassetsColorNames side-effect populated by emitXcassetsColorsets.
// We compute all outputs up-front, then let sd.buildAllPlatforms() write them.

const sd = new StyleDictionary({
  // Synthetic trigger token: SD v5's format hooks only fire when at least one
  // token survives platform filtering. Our DTCG loader runs out-of-band above
  // (custom group-$type inheritance is not supported by SD's stock DTCG parser),
  // so the real tokens are closed over by the format functions. The single
  // `_trigger` token below exists solely to make SD's per-platform format
  // invocation fire so our pre-computed strings land on disk via SD's writer.
  tokens: { _sdv5: { trigger: { value: 'synthetic' } } },
  platforms: {
    'web/css': {
      buildPath: distDir + '/',
      files: [
        { destination: 'tokens.css', format: 'lifegames/tokens.css' },
        { destination: 'tokens-layered.css', format: 'lifegames/tokens-layered.css' },
        { destination: 'tokens.js', format: 'lifegames/tokens.js' },
        { destination: 'tokens.json', format: 'lifegames/tokens.json' },
        { destination: 'DESIGN.md', format: 'lifegames/DESIGN.md' },
        { destination: 'shadcn.css', format: 'lifegames/shadcn.css' },
        { destination: 'deprecated-tokens.json', format: 'lifegames/deprecated-tokens.json' },
        { destination: 'tokens.dtcg.json', format: 'lifegames/tokens.dtcg.json' },
        { destination: 'build-report.json', format: 'lifegames/build-report.json' },
      ],
    },
    'ios/xcassets': {
      buildPath: xcassetsDir + '/',
      files: [{ destination: 'Contents.json', format: 'lifegames/xcassets-root' }],
    },
    'ios/swift': {
      buildPath: swiftDir + '/',
      files: [
        { destination: 'Color+Tokens.swift', format: 'lifegames/Color+Tokens.swift' },
        { destination: 'Spacing.swift', format: 'lifegames/Spacing.swift' },
        { destination: 'Font+Tokens.swift', format: 'lifegames/Font+Tokens.swift' },
        { destination: 'Shadow+Tokens.swift', format: 'lifegames/Shadow+Tokens.swift' },
        { destination: 'ReducedMotion.swift', format: 'lifegames/ReducedMotion.swift' },
        { destination: 'AISurfaces.swift', format: 'lifegames/AISurfaces.swift' },
      ],
    },
  },
});

// Compute outputs up-front so SD's format hooks just return pre-built strings.
// Order: xcassets must run before Color+Tokens because the latter consumes the
// xcassetsColorNames side-effect array.

const cssOut = emitTokensCss();
const cssLayeredOut = emitTokensCssLayered(cssOut);
const jsonTokens = buildJsonTokens();
const tokensJsOut = emitTokensJs(jsonTokens);
const tokensJsonOut = emitTokensJson(jsonTokens);
const xcassetsRootOut = emitXcassetsColorsets(); // sidecar-writes 92 colorsets
const colorTokensOut = emitColorTokensSwift(); // consumes xcassetsColorNames
const spacingOut = emitSpacingSwift();
const fontOut = emitFontTokensSwift();
const shadowOut = emitShadowTokensSwift();
const reducedMotionOut = emitReducedMotionSwift();
const aiSurfacesOut = emitAISurfacesSwift();

const designMdPath = resolve(distDir, 'DESIGN.md');
const previousMd = existsSync(designMdPath) ? readFileSync(designMdPath, 'utf-8') : '';
const designMdOut = emitDesignMd();
const designMdChanged = previousMd !== designMdOut;

const shadcnOut = emitShadcnCss();
const deprecatedOut = emitDeprecatedTokensJson();
const tokensDtcgOut = emitTokensDtcgJson();
// build-report sizes are computed across the six dist files emitted alongside it.
// We measure byte-length of the JS strings rather than reading back from disk to
// keep the report self-contained and reproducible regardless of fs encoding.
const buildReportFiles = [
  { path: 'tokens.css', bytes: Buffer.byteLength(cssOut, 'utf-8') },
  { path: 'tokens-layered.css', bytes: Buffer.byteLength(cssLayeredOut, 'utf-8') },
  { path: 'tokens.js', bytes: Buffer.byteLength(tokensJsOut, 'utf-8') },
  { path: 'tokens.json', bytes: Buffer.byteLength(tokensJsonOut, 'utf-8') },
  { path: 'DESIGN.md', bytes: Buffer.byteLength(designMdOut, 'utf-8') },
  { path: 'shadcn.css', bytes: Buffer.byteLength(shadcnOut, 'utf-8') },
  { path: 'deprecated-tokens.json', bytes: Buffer.byteLength(deprecatedOut, 'utf-8') },
  { path: 'tokens.dtcg.json', bytes: Buffer.byteLength(tokensDtcgOut, 'utf-8') },
];
const buildReportOut = emitBuildReportJson(buildReportFiles);

sd.registerFormat({ name: 'lifegames/tokens.css', format: () => cssOut });
sd.registerFormat({ name: 'lifegames/tokens-layered.css', format: () => cssLayeredOut });
sd.registerFormat({ name: 'lifegames/tokens.js', format: () => tokensJsOut });
sd.registerFormat({ name: 'lifegames/tokens.json', format: () => tokensJsonOut });
sd.registerFormat({ name: 'lifegames/DESIGN.md', format: () => designMdOut });
sd.registerFormat({ name: 'lifegames/shadcn.css', format: () => shadcnOut });
sd.registerFormat({ name: 'lifegames/deprecated-tokens.json', format: () => deprecatedOut });
sd.registerFormat({ name: 'lifegames/tokens.dtcg.json', format: () => tokensDtcgOut });
sd.registerFormat({ name: 'lifegames/build-report.json', format: () => buildReportOut });
sd.registerFormat({ name: 'lifegames/xcassets-root', format: () => xcassetsRootOut });
sd.registerFormat({ name: 'lifegames/Color+Tokens.swift', format: () => colorTokensOut });
sd.registerFormat({ name: 'lifegames/Spacing.swift', format: () => spacingOut });
sd.registerFormat({ name: 'lifegames/Font+Tokens.swift', format: () => fontOut });
sd.registerFormat({ name: 'lifegames/Shadow+Tokens.swift', format: () => shadowOut });
sd.registerFormat({ name: 'lifegames/ReducedMotion.swift', format: () => reducedMotionOut });
sd.registerFormat({ name: 'lifegames/AISurfaces.swift', format: () => aiSurfacesOut });

await sd.buildAllPlatforms();

console.log('Token build complete (Style Dictionary v5 engine).');
console.log(`  ${tokens.length} tokens processed`);
console.log('  CSS:      packages/tokens/dist/tokens.css');
console.log('  CSS:      packages/tokens/dist/tokens-layered.css');
console.log('  JS:       packages/tokens/dist/tokens.js');
console.log('  JSON:     packages/tokens/dist/tokens.json');
console.log('  MD:       packages/tokens/dist/DESIGN.md');
console.log(
  `  xcassets: Sources/LifegamesTokens/Resources/Colors.xcassets (${xcassetsColorNames.length} colorsets)`,
);
console.log('  Swift:    Sources/LifegamesTokens/Color+Tokens.swift');
console.log('  Swift:    Sources/LifegamesTokens/Spacing.swift');
console.log('  Swift:    Sources/LifegamesTokens/Font+Tokens.swift');
console.log('  Swift:    Sources/LifegamesTokens/Shadow+Tokens.swift');

if (designMdChanged && previousMd !== '') {
  console.log('');
  console.log(
    '  ⚠  DESIGN.md changed — re-upload to Claude Design with `pnpm sync:claude-design`',
  );
}

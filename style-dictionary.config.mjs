import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// --- Token Loading ---

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

function flattenTokens(obj, path = [], type = null) {
  const tokens = [];
  const currentType = obj.$type || type;
  for (const [key, val] of Object.entries(obj)) {
    if (key.startsWith('$')) continue;
    if (val && typeof val === 'object' && !Array.isArray(val) && !val.$value && val.$value !== 0) {
      tokens.push(...flattenTokens(val, [...path, key], currentType));
    } else if (val && typeof val === 'object' && ('$value' in val)) {
      tokens.push({
        path: [...path, key],
        $type: val.$type || currentType,
        $value: val.$value,
        $description: val.$description,
      });
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

  const resolved = [];
  for (const t of tokens) {
    let val = t.$value;
    if (typeof val === 'string' && val.startsWith('{')) {
      val = resolveReference(val, tokenMap);
    }
    resolved.push({ ...t, resolvedValue: val });
  }
  return resolved;
}

// --- Fluid values from web source ---

const FLUID_SPACING = {
  '50':   'clamp(1px, 0.02rem + 0.13vw, 2px)',
  '100':  'clamp(3px, 0.14rem + 0.13vw, 4px)',
  '150':  'clamp(4px, 0.16rem + 0.25vw, 6px)',
  '200':  'clamp(6px, 0.28rem + 0.25vw, 8px)',
  '250':  'clamp(7px, 0.30rem + 0.38vw, 10px)',
  '300':  'clamp(8px, 0.31rem + 0.50vw, 12px)',
  '350':  'clamp(10px, 0.44rem + 0.50vw, 14px)',
  '400':  'clamp(11px, 0.45rem + 0.63vw, 16px)',
  '450':  'clamp(12px, 0.47rem + 0.75vw, 18px)',
  '500':  'clamp(14px, 0.59rem + 0.75vw, 20px)',
  '600':  'clamp(16px, 0.63rem + 1.00vw, 24px)',
  '700':  'clamp(18px, 0.66rem + 1.25vw, 28px)',
  '800':  'clamp(22px, 0.91rem + 1.25vw, 32px)',
  '900':  'clamp(24px, 0.94rem + 1.50vw, 36px)',
  '1000': 'clamp(28px, 1.19rem + 1.50vw, 40px)',
  '1200': 'clamp(32px, 1.25rem + 2.00vw, 48px)',
};

const FLUID_TYPOGRAPHY = {
  'caption2': 'clamp(0.625rem, 0.58rem + 0.12vw, 0.72rem)',
  'caption':  'clamp(0.7rem, 0.64rem + 0.14vw, 0.78rem)',
  'footnote': 'clamp(0.72rem, 0.65rem + 0.20vw, 0.82rem)',
  'body':     'clamp(0.72rem, 0.65rem + 0.20vw, 0.82rem)',
  'callout':  'clamp(0.72rem, 0.65rem + 0.20vw, 0.82rem)',
  'subhead':  'clamp(0.88rem, 0.75rem + 0.34vw, 1.05rem)',
  'headline': 'clamp(1.20rem, 0.98rem + 0.60vw, 1.50rem)',
  'title3':   'clamp(1.60rem, 1.30rem + 0.80vw, 2.00rem)',
  'title2':   'clamp(1.90rem, 1.53rem + 1.00vw, 2.40rem)',
  'title1':   'clamp(2.10rem, 1.70rem + 1.05vw, 2.625rem)',
  'hero':     'clamp(1.80rem, 1.50rem + 0.80vw, 2.20rem)',
};

const IOS_TEXT_STYLE = {
  'caption2': '.caption2', 'caption': '.caption', 'footnote': '.footnote',
  'body': '.body', 'callout': '.callout', 'subhead': '.subheadline',
  'headline': '.headline', 'title3': '.title3', 'title2': '.title2',
  'title1': '.title', 'hero': '.largeTitle',
};

const SWIFT_FONT_WEIGHT = {
  300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold',
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
  if (a === 1.0) return `Color(red: ${r.toFixed(3)}, green: ${g.toFixed(3)}, blue: ${b.toFixed(3)})`;
  return `Color(red: ${r.toFixed(3)}, green: ${g.toFixed(3)}, blue: ${b.toFixed(3)}, opacity: ${a})`;
}

function toCamelCase(path) {
  return path.map((p, i) => {
    const clean = p.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
    return i === 0 ? clean : clean.charAt(0).toUpperCase() + clean.slice(1);
  }).join('');
}

function toCssVar(path) {
  return '--lg-' + path.join('-');
}

// --- Build ---

const raw = loadAllTokens();
const tokens = resolveAllTokens(raw);

const distDir = resolve(__dirname, 'packages/tokens/dist');
const swiftDir = resolve(__dirname, 'Sources/LifegamesTokens');
mkdirSync(distDir, { recursive: true });

// --- CSS ---
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
    const key = t.path[t.path.length - 1];
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
for (const t of tokens) {
  if (t.$type !== 'typography') continue;
  const name = t.path[t.path.length - 1];
  const fluid = FLUID_TYPOGRAPHY[name];
  if (fluid) css += `  --lg-font-size-${name}: ${fluid};\n`;
}

css += '\n  /* Font families */\n';
for (const t of tokens) {
  if (t.$type !== 'fontFamily') continue;
  css += `  ${toCssVar(t.path)}: '${t.resolvedValue}', sans-serif;\n`;
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
  const cssShadow = layers.map(l =>
    `${l.offsetX || 0}px ${l.offsetY || 0}px ${l.blur || 0}px ${l.spread || 0}px ${l.color}`
  ).join(', ');
  css += `  ${toCssVar(t.path)}: ${cssShadow};\n`;
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
css += '}\n';
writeFileSync(resolve(distDir, 'tokens.css'), css);

// Layered variant: same content wrapped in nested @layer for cascade-layer consumers.
// Public contract is @layer lifegames, site; internal sub-layer 'tokens' is private.
// Consumers should import @lifegames/tokens/preamble (declares the parent order)
// and then @lifegames/tokens/css.layered (which slots into @layer lifegames > tokens).
const cssLayered = `@layer lifegames { @layer tokens {\n${css.trimEnd()}\n} }\n`;
writeFileSync(resolve(distDir, 'tokens-layered.css'), cssLayered);

// --- JS/JSON ---
const jsonTokens = {};
for (const t of tokens) {
  let obj = jsonTokens;
  for (let i = 0; i < t.path.length - 1; i++) {
    if (!obj[t.path[i]]) obj[t.path[i]] = {};
    obj = obj[t.path[i]];
  }
  obj[t.path[t.path.length - 1]] = t.resolvedValue;
}
writeFileSync(resolve(distDir, 'tokens.js'),
  '// Generated by Style Dictionary — do not edit\nexport default ' + JSON.stringify(jsonTokens, null, 2) + ';\n');
writeFileSync(resolve(distDir, 'tokens.json'), JSON.stringify(jsonTokens, null, 2) + '\n');

// --- Swift: Color+Tokens.swift ---
let swiftColors = '// Generated by Style Dictionary — do not edit\nimport SwiftUI\n\npublic extension Color {\n';
for (const t of tokens) {
  if (t.$type !== 'color') continue;
  const name = toCamelCase(t.path);
  const val = t.resolvedValue;
  if (typeof val === 'string' && val.startsWith('#')) {
    swiftColors += `    static let ${name} = ${hexToSwiftColor(val)}\n`;
  } else if (typeof val === 'string' && val.startsWith('rgba')) {
    const swift = rgbaToSwiftColor(val);
    if (swift) swiftColors += `    static let ${name} = ${swift}\n`;
  }
}
swiftColors += '}\n';
writeFileSync(resolve(swiftDir, 'Color+Tokens.swift'), swiftColors);

// --- Swift: Spacing.swift ---
let swiftSpacing = '// Generated by Style Dictionary — do not edit\nimport CoreGraphics\n\npublic enum Spacing {\n';
for (const t of tokens) {
  if (t.$type !== 'dimension' || t.path[0] !== 'space') continue;
  const key = t.path[t.path.length - 1];
  const val = t.resolvedValue;
  const num = parseFloat(String(val));
  if (!isNaN(num)) swiftSpacing += `    public static let s${key}: CGFloat = ${num}\n`;
}
swiftSpacing += '}\n';
writeFileSync(resolve(swiftDir, 'Spacing.swift'), swiftSpacing);

// --- Swift: Font+Tokens.swift ---
let swiftFonts = '// Generated by Style Dictionary — do not edit\nimport SwiftUI\n\npublic extension Font {\n    enum Tokens {\n';
for (const t of tokens) {
  if (t.$type !== 'typography') continue;
  const name = t.path[t.path.length - 1];
  const val = t.resolvedValue;
  if (!val || typeof val !== 'object') continue;
  const size = val.fontSizeMax || 17;
  const weight = SWIFT_FONT_WEIGHT[val.fontWeight] || 'Regular';
  const textStyle = IOS_TEXT_STYLE[name] || '.body';
  swiftFonts += `        public static func ${name}() -> Font {\n`;
  swiftFonts += `            .custom("SpaceGrotesk-${weight}", size: ${size}, relativeTo: ${textStyle})\n`;
  swiftFonts += `        }\n`;
}
swiftFonts += '    }\n}\n';
writeFileSync(resolve(swiftDir, 'Font+Tokens.swift'), swiftFonts);

// --- Swift: Shadow+Tokens.swift ---
const shadowTokens = tokens.filter(t => t.$type === 'shadow');
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
    if (swift) swiftShadows += `            .shadow(color: ${swift}, radius: ${radius}, x: ${layer.offsetX || 0}, y: ${layer.offsetY || 0})\n`;
  }
  swiftShadows += `    }\n}\n\n`;
}
writeFileSync(resolve(swiftDir, 'Shadow+Tokens.swift'), swiftShadows);

// --- DESIGN.md (Claude Design import artifact) ---
//
// Single-file markdown brief consumed by claude.ai/design. The format follows
// the community DESIGN.md convention (Google Stitch / VoltAgent awesome-claude-design):
// tokens + rules + rationale in one human-readable file, deterministic so diffs
// are reviewable. Re-upload to Claude Design after each meaningful token change.

function tokensOfType(type) {
  return tokens.filter(t => t.$type === type);
}

function tokensUnderPath(prefix) {
  return tokens.filter(t => t.path[0] === prefix);
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
md += 'Lifegames is a dark-first, neon-accented, cross-platform design system spanning web (Astro) and iOS (SwiftUI). ';
md += 'Visual language: deep near-black surfaces, glassy translucent cards, vivid neon accents (pink, indigo, cyan), ';
md += 'fluid typography that scales with viewport, and motion that favors decelerated easing.\n\n';

md += '## Token Architecture\n\n';
md += 'Four tiers, applied in order of specificity:\n\n';
md += '1. **Primitive** — raw values (`color.pink.500 = #ff006e`). Never reference these directly from components.\n';
md += '2. **Semantic** — role-based aliases (`color.accent.pink → {color.pink.500}`). The consumer-facing layer.\n';
md += '3. **Component** — component-scoped overrides (`card.background`).\n';
md += '4. **Widget** — widget-scoped overrides (optional tier).\n\n';
md += '**Rule:** Token names encode ROLE, not value. Use `color.accent.pink`, never `color.ff006e`.\n\n';

md += '## Color Palette\n\n';
md += '### Primitive colors\n\n';
md += '| Token | Value |\n|---|---|\n';
for (const t of tokensOfType('color')) {
  if (t.path[0] !== 'color') continue;
  if (t.path.length < 2) continue;
  if (t.path[1] === 'surface' || t.path[1] === 'border' || t.path[1] === 'text' ||
      t.path[1] === 'accent' || t.path[1] === 'accent-hc' || t.path[1] === 'health' ||
      t.path[1] === 'interactive' || t.path[1] === 'status' || t.path[1] === 'overlay') continue;
  md += `| \`${fmtRef(t)}\` | \`${fmtValue(t.resolvedValue)}\` |\n`;
}
md += '\n';

md += '### Semantic roles\n\n';
const semanticGroups = ['surface', 'border', 'text', 'accent', 'accent-hc', 'health', 'interactive', 'status', 'overlay'];
for (const group of semanticGroups) {
  const groupTokens = tokens.filter(t => t.$type === 'color' && t.path[0] === 'color' && t.path[1] === group);
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
md += 'Fluid type scale via `clamp()` on web; SwiftUI `Font.custom(..., relativeTo:)` on iOS for Dynamic Type. ';
md += 'Font family: **Space Grotesk** (PostScript names: `SpaceGrotesk-Regular`, `-Medium`, `-SemiBold`, `-Bold`, `-Light`).\n\n';
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
md += '\n**Default behavior:** prefer `standard` for most transitions, `decelerate` for entering elements, `overshoot` for playful affordances.\n\n';

md += '## Shadows\n\n';
md += '| Token | Layers |\n|---|---|\n';
for (const t of tokensOfType('shadow')) {
  const v = t.resolvedValue;
  if (!v) continue;
  const layers = Array.isArray(v) ? v : [v];
  const summary = layers.map(l =>
    `${l.offsetX || 0}px ${l.offsetY || 0}px ${l.blur || 0}px ${l.spread || 0}px ${l.color}`
  ).join(' / ');
  md += `| \`${fmtRef(t)}\` | \`${summary}\` |\n`;
}
md += '\n';

md += '## Component Tokens\n\n';
const componentRoots = new Set();
for (const t of tokens) {
  if (['color', 'space', 'motion', 'typography', 'shadow', 'font'].includes(t.path[0])) continue;
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
const manifestPath = resolve(__dirname, 'Sources/LifegamesWidgets/Resources/widgets/widget-manifest.json');
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
md += '- **No raw `Color(hex:)` or `Color(red:green:blue:)`** in Swift component files — use generated `LifegamesTokens` constants.\n';
md += '- **No raw hex in CSS** — use `var(--lg-*)` custom properties from `@lifegames/tokens`.\n';
md += '- All neon colors MUST resolve to **identical hex values** across web and iOS.\n';
md += '- All SwiftUI `#Preview` blocks MUST include `.preferredColorScheme(.dark)`.\n';
md += '- Fluid typography and spacing via `clamp()` on web; SwiftUI uses `relativeTo:` for Dynamic Type on iOS.\n\n';

md += '## CSS Custom Property Naming\n\n';
md += 'All web-consumed tokens are exposed as CSS custom properties prefixed `--lg-`. Example: `color.accent.pink → var(--lg-color-accent-pink)`.\n\n';

md += '## Source of Truth\n\n';
md += '- DTCG JSON: `tokens/*.tokens.json` in [design-system-Lifegames](https://github.com/) (canonical)\n';
md += '- Build: `pnpm build:tokens`\n';
md += '- Outputs: `packages/tokens/dist/{tokens.css,tokens.js,tokens.json}`, `Sources/LifegamesTokens/*.swift`\n';
md += '- This file: `packages/tokens/dist/DESIGN.md` — regenerated on every build.\n';

const designMdPath = resolve(distDir, 'DESIGN.md');
const previousMd = existsSync(designMdPath) ? readFileSync(designMdPath, 'utf-8') : '';
writeFileSync(designMdPath, md);
const designMdChanged = previousMd !== md;

console.log('Token build complete.');
console.log(`  ${tokens.length} tokens processed`);
console.log('  CSS:   packages/tokens/dist/tokens.css');
console.log('  CSS:   packages/tokens/dist/tokens-layered.css');
console.log('  JS:    packages/tokens/dist/tokens.js');
console.log('  JSON:  packages/tokens/dist/tokens.json');
console.log('  MD:    packages/tokens/dist/DESIGN.md');
console.log('  Swift: Sources/LifegamesTokens/Color+Tokens.swift');
console.log('  Swift: Sources/LifegamesTokens/Spacing.swift');
console.log('  Swift: Sources/LifegamesTokens/Font+Tokens.swift');
console.log('  Swift: Sources/LifegamesTokens/Shadow+Tokens.swift');

if (designMdChanged && previousMd !== '') {
  console.log('');
  console.log('  ⚠  DESIGN.md changed — re-upload to Claude Design with `pnpm sync:claude-design`');
}

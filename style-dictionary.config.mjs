import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
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

console.log('Token build complete.');
console.log(`  ${tokens.length} tokens processed`);
console.log('  CSS:   packages/tokens/dist/tokens.css');
console.log('  JS:    packages/tokens/dist/tokens.js');
console.log('  JSON:  packages/tokens/dist/tokens.json');
console.log('  Swift: Sources/LifegamesTokens/Color+Tokens.swift');
console.log('  Swift: Sources/LifegamesTokens/Spacing.swift');
console.log('  Swift: Sources/LifegamesTokens/Font+Tokens.swift');
console.log('  Swift: Sources/LifegamesTokens/Shadow+Tokens.swift');

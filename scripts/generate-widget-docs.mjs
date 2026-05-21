#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const MANIFEST_PATH = path.join(ROOT, 'Sources/LifegamesWidgets/Resources/widgets/widget-manifest.json');
const WIDGETS_DIR = path.join(ROOT, 'packages/web/src/widgets');
const FIXTURES_DIR = path.join(ROOT, 'Sources/LifegamesWidgets/Resources/widgets');
const OUTPUT_DIR = path.join(ROOT, 'apps/docs/src/content/docs/widgets');
const AUDIT_PATH = path.join(ROOT, 'tests/widget-props-audit.json');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const EMIT_STDOUT = args.includes('--emit-stdout');
const log = (...a) => EMIT_STDOUT ? process.stderr.write(a.join(' ') + '\n') : console.log(...a);
const logError = (...a) => process.stderr.write(a.join(' ') + '\n');

const SINGLE_WIDGET = (() => {
  const idx = args.indexOf('--widget');
  if (idx !== -1) return args[idx + 1];
  const eqArg = args.find(a => a.startsWith('--widget='));
  if (eqArg) return eqArg.split('=')[1];
  return null;
})();

function toKebab(name) {
  return name
    .replace(/V(\d+)$/, '-v$1')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

function toPascalCategory(cat) {
  return cat.charAt(0).toUpperCase() + cat.slice(1);
}

function resolveActualFilename(category, manifestName, ext) {
  const catDir = path.join(WIDGETS_DIR, category);
  const exact = manifestName + ext;
  if (fs.existsSync(path.join(catDir, exact))) return manifestName;
  const files = fs.readdirSync(catDir).filter(f => f.endsWith(ext));
  const match = files.find(f => f.startsWith(manifestName));
  if (match) return match.replace(ext, '');
  return null;
}

function auditPropsUsage() {
  const audit = {};
  for (const category of fs.readdirSync(WIDGETS_DIR)) {
    const catDir = path.join(WIDGETS_DIR, category);
    if (!fs.statSync(catDir).isDirectory()) continue;
    for (const file of fs.readdirSync(catDir).filter(f => f.endsWith('.astro'))) {
      const name = file.replace('.astro', '');
      const source = fs.readFileSync(path.join(catDir, file), 'utf-8');
      audit[name] = source.includes('Astro.props') ? 'props' : 'static';
    }
  }
  return audit;
}

function extractPropsInterface(source, interfaceName) {
  const startRe = new RegExp(`export interface ${interfaceName}\\s*\\{`);
  const startMatch = source.match(startRe);
  if (!startMatch) return null;
  const start = startMatch.index + startMatch[0].length;
  let depth = 1;
  let i = start;
  while (i < source.length && depth > 0) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') depth--;
    i++;
  }
  if (depth !== 0) throw new Error(`Unbalanced braces in ${interfaceName}`);
  return source.slice(start, i - 1);
}

function parseTopLevelFields(body) {
  const fields = [];
  let depth = 0;
  let currentField = '';
  for (const line of body.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*')) continue;

    for (const ch of trimmed) {
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
    }

    currentField += trimmed + '\n';

    if (depth === 0 && (trimmed.endsWith(';') || trimmed.endsWith('[];') || trimmed.endsWith('}[];') || trimmed.endsWith('}'))) {
      fields.push(currentField.trim());
      currentField = '';
    }
  }
  if (currentField.trim()) {
    fields.push(currentField.trim());
  }
  return fields.map(f => {
    const match = f.match(/^(\w+)(\??):\s*([\s\S]+?);?\s*$/);
    if (!match) return null;
    const [, name, optional, rawType] = match;
    const isNested = rawType.includes('{');
    let type;
    if (isNested) {
      type = rawType.includes('[]') ? 'Array<object>' : 'object';
    } else {
      type = rawType.trim().replace(/;$/, '');
    }
    return {
      name,
      optional: optional === '?',
      type,
      nestedShape: isNested ? rawType.trim().replace(/;$/, '') : null,
    };
  }).filter(Boolean);
}

function generateDynamicMdx(widget, actualName, fields, index) {
  const { category, name, viewType, fixturePath } = widget;
  const kebab = toKebab(actualName);

  let propsTable = '| Prop | Type | Required | Description |\n|------|------|----------|-------------|\n';
  const detailsBlocks = [];

  for (const field of fields) {
    propsTable += `| \`${field.name}\` | \`${field.type}\` | ${field.optional ? 'No' : 'Yes'} | — |\n`;
    if (field.nestedShape) {
      detailsBlocks.push(
        `<details>\n<summary><code>${field.name}</code> shape</summary>\n\n\`\`\`typescript\n${field.nestedShape}\n\`\`\`\n\n</details>`
      );
    }
  }

  const detailsSection = detailsBlocks.length > 0 ? '\n' + detailsBlocks.join('\n\n') + '\n' : '';

  return `---
title: "${name}"
description: "${category} widget -- ${name}"
sidebar:
  order: ${index}
generated-by: widget-docs-codegen
---

import ${actualName} from '@widgets/${category}/${actualName}.astro';
import fixture from '@fixtures/${fixturePath}';

## Live Preview

<div data-widget-preview style="margin: var(--space-20) 0;">
  <${actualName} {...fixture} />
</div>

## Props

${propsTable}${detailsSection}
## Usage

\`\`\`astro
---
import ${actualName} from '@lifegames/web/widgets/${category}/${actualName}.astro';
---
<${actualName} {...data} />
\`\`\`

## Cross-Platform

- **Web:** \`packages/web/src/widgets/${category}/${actualName}.astro\`
- **iOS:** \`Sources/LifegamesWidgets/${toPascalCategory(category)}/${viewType}.swift\`
- **Fixture:** \`Sources/LifegamesWidgets/Resources/widgets/${fixturePath}\`
`;
}

function generateStaticMdx(widget, actualName, fields, index) {
  const { category, name, viewType, fixturePath } = widget;

  let dataTable = '| Field | Type | Required | Description |\n|------|------|----------|-------------|\n';
  const detailsBlocks = [];

  for (const field of fields) {
    dataTable += `| \`${field.name}\` | \`${field.type}\` | ${field.optional ? 'No' : 'Yes'} | — |\n`;
    if (field.nestedShape) {
      detailsBlocks.push(
        `<details>\n<summary><code>${field.name}</code> shape</summary>\n\n\`\`\`typescript\n${field.nestedShape}\n\`\`\`\n\n</details>`
      );
    }
  }

  const detailsSection = detailsBlocks.length > 0 ? '\n' + detailsBlocks.join('\n\n') + '\n' : '';

  return `---
title: "${name}"
description: "${category} widget -- ${name}"
sidebar:
  order: ${index}
generated-by: widget-docs-codegen
---

import ${actualName} from '@widgets/${category}/${actualName}.astro';

## Live Preview

<div data-widget-preview style="margin: var(--space-20) 0;">
  <${actualName} />
</div>

:::caution[Static Component]
This widget does not read props at runtime. It renders hardcoded/client-hydrated content.
The \`.types.ts\` file documents the data shape consumed by the codegen pipeline and fixture system only.
:::

## Data Shape (Pipeline Only)

${dataTable}${detailsSection}
## Cross-Platform

- **Web:** \`packages/web/src/widgets/${category}/${actualName}.astro\`
- **iOS:** \`Sources/LifegamesWidgets/${toPascalCategory(category)}/${viewType}.swift\`
- **Fixture:** \`Sources/LifegamesWidgets/Resources/widgets/${fixturePath}\`

_Storybook stories were deleted in v0.1.1; widget documentation lives at this page._
`;
}

function cleanOrphans(manifest, outputDir) {
  const expectedFiles = new Set();
  for (const w of manifest.widgets) {
    const actualName = resolveActualFilename(w.category, w.name, '.astro');
    const kebab = toKebab(actualName || w.name);
    expectedFiles.add(path.join(outputDir, w.category, `${kebab}.mdx`));
  }

  let deleted = 0;
  for (const category of fs.readdirSync(outputDir).filter(f => {
    const p = path.join(outputDir, f);
    return fs.existsSync(p) && fs.statSync(p).isDirectory();
  })) {
    const catDir = path.join(outputDir, category);
    for (const file of fs.readdirSync(catDir).filter(f => f.endsWith('.mdx') && f !== 'index.mdx')) {
      const filePath = path.join(catDir, file);
      if (!expectedFiles.has(filePath)) {
        if (!DRY_RUN) fs.unlinkSync(filePath);
        log(`[orphan] deleted widgets/${category}/${file}`);
        deleted++;
      }
    }
  }
  return deleted;
}

function main() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
  const audit = auditPropsUsage();

  if (!DRY_RUN) {
    fs.mkdirSync(path.dirname(AUDIT_PATH), { recursive: true });
    fs.writeFileSync(AUDIT_PATH, JSON.stringify(audit, null, 2) + '\n');
    log(`[audit] wrote ${Object.keys(audit).length} entries to tests/widget-props-audit.json`);
  }

  const categoryCounts = {};
  let orphansDeleted = 0;

  // Pre-compute order index for every widget in the full manifest
  const widgetOrderMap = new Map();
  const catCounters = {};
  for (const w of manifest.widgets) {
    if (!catCounters[w.category]) catCounters[w.category] = 0;
    widgetOrderMap.set(`${w.category}/${w.name}`, catCounters[w.category]++);
  }

  if (!DRY_RUN) {
    orphansDeleted = cleanOrphans(manifest, OUTPUT_DIR);
  }

  const stdoutBlocks = [];
  let created = 0;
  let updated = 0;
  let unchanged = 0;
  let failed = 0;

  const widgetsToProcess = SINGLE_WIDGET
    ? manifest.widgets.filter(w => {
        const actualName = resolveActualFilename(w.category, w.name, '.astro');
        const kebab = toKebab(actualName || w.name);
        return kebab === SINGLE_WIDGET || w.name === SINGLE_WIDGET || (actualName && toKebab(actualName) === SINGLE_WIDGET);
      })
    : manifest.widgets;

  for (const widget of widgetsToProcess) {
    const { category, name } = widget;

    const actualName = resolveActualFilename(category, name, '.astro');
    if (!actualName) {
      logError(`[error] Could not resolve .astro file for ${name} in ${category}/`);
      failed++;
      continue;
    }

    const typesName = resolveActualFilename(category, name, '.types.ts');
    const interfaceName = typesName ? `${typesName}Props` : `${actualName}Props`;

    let fields = [];
    if (typesName) {
      const typesPath = path.join(WIDGETS_DIR, category, `${typesName}.types.ts`);
      try {
        const typesSource = fs.readFileSync(typesPath, 'utf-8');
        const body = extractPropsInterface(typesSource, interfaceName);
        if (body) {
          fields = parseTopLevelFields(body);
        }
      } catch (e) {
        logError(`[warn] Failed to parse Props for ${name}: ${e.message}`);
      }
    }

    const index = widgetOrderMap.get(`${category}/${name}`) ?? 0;
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;

    const isStatic = audit[actualName] === 'static';
    const mdxContent = isStatic
      ? generateStaticMdx(widget, actualName, fields, index)
      : generateDynamicMdx(widget, actualName, fields, index);

    const kebab = toKebab(actualName);
    const relPath = `${category}/${kebab}.mdx`;

    if (EMIT_STDOUT) {
      stdoutBlocks.push(`--- FILE: ${relPath} ---\n${mdxContent}`);
    }

    if (!DRY_RUN) {
      const outPath = path.join(OUTPUT_DIR, category, `${kebab}.mdx`);
      fs.mkdirSync(path.dirname(outPath), { recursive: true });

      let existing = null;
      try {
        existing = fs.readFileSync(outPath, 'utf-8');
      } catch {}

      if (existing === mdxContent) {
        log(`[unchanged] widgets/${relPath}`);
        unchanged++;
      } else {
        fs.writeFileSync(outPath, mdxContent);
        if (existing === null) {
          log(`[created] widgets/${relPath}`);
          created++;
        } else {
          log(`[updated] widgets/${relPath}`);
          updated++;
        }
      }
    }
  }

  if (EMIT_STDOUT) {
    process.stdout.write(stdoutBlocks.join('\n'));
  }

  const total = created + updated + unchanged;
  const countSummary = Object.entries(categoryCounts)
    .map(([cat, count]) => `${count} ${cat}`)
    .join(', ');
  log(`\nGenerated ${total} widget docs (${countSummary}). Deleted ${orphansDeleted} orphans. Failed: ${failed}.`);
  if (created > 0) log(`  Created: ${created}`);
  if (updated > 0) log(`  Updated: ${updated}`);
  if (unchanged > 0) log(`  Unchanged: ${unchanged}`);

  if (failed > 0) process.exit(1);
}

main();

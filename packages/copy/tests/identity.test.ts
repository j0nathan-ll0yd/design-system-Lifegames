import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { _Parser } from '@formatjs/icu-messageformat-parser';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');

const richSchema = JSON.parse(readFileSync(join(PKG, 'schema', 'identity.schema.json'), 'utf-8'));
const richInstance = JSON.parse(readFileSync(join(PKG, 'src', 'identity.en-US.json'), 'utf-8'));
const flatSchema = JSON.parse(readFileSync(join(PKG, 'dist', 'identity.flat.schema.json'), 'utf-8'));
const flatInstance = JSON.parse(readFileSync(join(PKG, 'dist', 'identity.flat.json'), 'utf-8'));

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

/** Parse an ICU MF1 string without throwing: returns { val, err }. */
function parseMF1(message: string) {
  return new _Parser(message, { requiresOtherClause: false, ignoreTag: true }).parse();
}

interface Leaf {
  path: string;
  values: string[];
  maxChars?: number;
}

function collectLeaves(node: unknown, path: string, out: Leaf[]): void {
  if (node && typeof node === 'object' && !Array.isArray(node) && 'value' in node && '_meta' in node) {
    const leaf = node as { value: string | string[]; _meta?: { constraints?: { maxChars?: number } } };
    out.push({
      path,
      values: Array.isArray(leaf.value) ? leaf.value : [leaf.value],
      maxChars: leaf._meta?.constraints?.maxChars,
    });
    return;
  }
  if (node && typeof node === 'object' && !Array.isArray(node)) {
    for (const [key, value] of Object.entries(node)) {
      collectLeaves(value, path ? `${path}.${key}` : key, out);
    }
  }
}

const leaves: Leaf[] = [];
collectLeaves(richInstance, '', leaves);

describe('@lifegames/copy identity', () => {
  it('rich instance validates against the rich schema', () => {
    const validate = ajv.compile(richSchema);
    const ok = validate(richInstance);
    expect(validate.errors ?? null).toBeNull();
    expect(ok).toBe(true);
  });

  it('derived flat schema validates the flat instance (round-trip)', () => {
    const validate = ajv.compile(flatSchema);
    const ok = validate(flatInstance);
    expect(validate.errors ?? null).toBeNull();
    expect(ok).toBe(true);
  });

  it('captures the full identity surface', () => {
    // Sanity: 25 leaves (person 14 + site 5 + seo 4 + a11y 2).
    expect(leaves.length).toBe(25);
  });

  it('every string value is valid ICU MessageFormat 1', () => {
    const failures: string[] = [];
    for (const leaf of leaves) {
      for (const value of leaf.values) {
        const result = parseMF1(value);
        if (result.err) {
          failures.push(`${leaf.path}: ${result.err.message} — "${value}"`);
        }
      }
    }
    expect(failures).toEqual([]);
  });

  it('every maxChars constraint is satisfied', () => {
    const failures: string[] = [];
    for (const leaf of leaves) {
      if (leaf.maxChars == null) continue;
      for (const value of leaf.values) {
        if (value.length > leaf.maxChars) {
          failures.push(`${leaf.path}: ${value.length} > maxChars ${leaf.maxChars} — "${value}"`);
        }
      }
    }
    expect(failures).toEqual([]);
  });
});

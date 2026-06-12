import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { _Parser } from '@formatjs/icu-messageformat-parser';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');

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

function readJson(p: string): unknown {
  return JSON.parse(readFileSync(p, 'utf-8'));
}

/** One namespace's authoring + generated artifacts, plus its expected leaf count. */
interface NamespaceFixture {
  name: string;
  /** Sanity leaf count. */
  expectedLeaves: number;
}

const NAMESPACES: NamespaceFixture[] = [
  // identity: person 14 + site 5 + seo 4 + a11y 2.
  { name: 'identity', expectedLeaves: 25 },
  // widgets: heartRate 16 + movement 14 + workouts 10 + hydration 4 + nightSummary 9
  //   + exploration 5 + topPlaces 2 + readingFeed 3 + bookshelf 5 + theatreReviews 2
  //   + bookModal 7 + devLog 2 + starredRepos 2 + bio 3 + systemStatus 4 + identityCard 5.
  { name: 'widgets', expectedLeaves: 93 },
  // a11y: movement 2 + identity 2 + bookshelf 1 + bookModal 1 + modal 1
  //   + readingFeed 1 + nav 2 + region 2 + clock 1 + page404 1.
  { name: 'a11y', expectedLeaves: 14 },
  // app: nav 10 + tab 5 + common 7 + home 12 + settings 35 + savedPlaces 4
  //   + addPlace 9 + health 20 + sleep 8 + location 73 + bookshelf 49 + watch 12.
  { name: 'app', expectedLeaves: 244 },
  // permissions: health 2 + locationWhenInUse 2 + locationAlways 1 + motion 1.
  { name: 'permissions', expectedLeaves: 6 },
  // errors: validation 2 + client 2.
  { name: 'errors', expectedLeaves: 4 },
  // llm: txt 33 + full 103.
  { name: 'llm', expectedLeaves: 136 },
];

for (const ns of NAMESPACES) {
  const richSchema = readJson(join(PKG, 'schema', `${ns.name}.schema.json`));
  const richInstance = readJson(join(PKG, 'src', `${ns.name}.en-US.json`));
  const flatSchema = readJson(join(PKG, 'dist', `${ns.name}.flat.schema.json`));
  const flatInstance = readJson(join(PKG, 'dist', `${ns.name}.flat.json`));

  const leaves: Leaf[] = [];
  collectLeaves(richInstance, '', leaves);

  describe(`@lifegames/copy ${ns.name}`, () => {
    it('rich instance validates against the rich schema', () => {
      const validate = ajv.compile(richSchema as object);
      const ok = validate(richInstance);
      expect(validate.errors ?? null).toBeNull();
      expect(ok).toBe(true);
    });

    it('derived flat schema validates the flat instance (round-trip)', () => {
      const validate = ajv.compile(flatSchema as object);
      const ok = validate(flatInstance);
      expect(validate.errors ?? null).toBeNull();
      expect(ok).toBe(true);
    });

    it(`captures the full ${ns.name} surface`, () => {
      expect(leaves.length).toBe(ns.expectedLeaves);
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
}

describe('@lifegames/copy cross-namespace invariants', () => {
  it('the $defs block is byte-identical across every schema (per-file inlined, §3.2)', () => {
    const defs = NAMESPACES.map((ns) => {
      const schema = readJson(join(PKG, 'schema', `${ns.name}.schema.json`)) as Record<string, unknown>;
      return JSON.stringify(schema['$defs']);
    });
    for (let i = 1; i < defs.length; i++) {
      expect(defs[i]).toBe(defs[0]);
    }
  });
});

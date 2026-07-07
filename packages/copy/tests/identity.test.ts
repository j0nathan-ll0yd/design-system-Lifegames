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
  if (
    node &&
    typeof node === 'object' &&
    !Array.isArray(node) &&
    'value' in node &&
    '_meta' in node
  ) {
    const leaf = node as {
      value: string | string[];
      _meta?: { constraints?: { maxChars?: number } };
    };
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
  // identity: person 16 + site 5 + seo 4 + a11y 2 + humansTxt 4 + feed 9 (title/description/author/copyright + sections.*5) + privacy 16 (title/lastUpdated/lastUpdatedLabel/backLink/whoHeading/dataDisplayedHeading/dataCollectedHeading/analyticsHeading/rightsHeading/changesHeading/who/dataDisplayed/dataCollected/analytics/rights/changes).
  { name: 'identity', expectedLeaves: 56 },
  // widgets: heartRate 16 + movement 14 + workouts 10 + hydration 4 + nightSummary 9
  //   + exploration 5 + topPlaces 2 + readingFeed 3 + bookshelf 9 + theatreReviews 2
  //   + bookModal 8 + devLog 3 + starredRepos 3 + bio 3 + identityCard 5
  //   + systemStatus 4 (title/valueActive/valueOffline/timestampRealtime)
  //   + systemStatus.sources 23 — each source is a structured {body, refs} pair
  //     (body CopyString + one label/href CopyString pair per link ref):
  //     health 7 (body + watch/water/coffee ×2) + sleep 3 (body + watch ×2)
  //     + books 1 (body, no refs) + articles 3 (body + feedly ×2)
  //     + githubEvents 3 (body + github ×2) + starredRepos 3 (body + github ×2)
  //     + theatreReviews 3 (body + squarespace ×2)
  //   + coffee 15 (sipping/caffeineUnit/thisCup/dailyLabel/searching + action ×4
  //     [connect/reconnect/finishCup/newCup] + badge ×3 [connect/connected/error]
  //     + beverage ×3 [drip/espresso/coldBrew]).
  { name: 'widgets', expectedLeaves: 138 },
  // a11y: movement 2 + identity 2 + bookshelf 1 + bookModal 1 + modal 1
  //   + readingFeed 1 + nav 2 + region 2 + clock 1 + page404 1
  //   + coffee 8 (mug/caffeineThisCup/dailyCaffeine + action ×5
  //     [connect/searching/reconnect/finishCup/newCup]).
  { name: 'a11y', expectedLeaves: 22 },
  // app: nav 10 + common 7 + home 12 + settings 33 + savedPlaces 4
  //   + addPlace 9 + health 9 + sleep 8 + location 73 + bookshelf 50 + watch 12
  //   + sections 2 + page404 2.
  { name: 'app', expectedLeaves: 231 },
  // permissions: health 2 + locationWhenInUse 2 + locationAlways 1 + motion 1.
  { name: 'permissions', expectedLeaves: 6 },
  // errors: validation 2 + client 2.
  { name: 'errors', expectedLeaves: 4 },
  // llm: txt 33 + full 103 + dashboard 3 + mcp 31 + agentDiscovery 13.
  { name: 'llm', expectedLeaves: 183 },
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
  it('the $defs block is byte-identical across every schema (inlined per file, no cross-file $ref)', () => {
    const defs = NAMESPACES.map((ns) => {
      const schema = readJson(join(PKG, 'schema', `${ns.name}.schema.json`)) as Record<
        string,
        unknown
      >;
      return JSON.stringify(schema['$defs']);
    });
    for (let i = 1; i < defs.length; i++) {
      expect(defs[i]).toBe(defs[0]);
    }
  });
});

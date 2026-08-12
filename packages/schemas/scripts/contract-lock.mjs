// Pure document model for .contract-lock.json, shared by generate-contract-lock.ts
// and its tests.
//
// Authored as .mjs (same precedent as portal-contract-source.mjs) so plain-node
// `node --test` can import it without a TypeScript loader; the sibling .d.mts types
// it for the tsx-run .ts generator.

/**
 * Projection of a lock's MEANINGFUL content — everything except `generatedAt`.
 * Serialized so two locks can be compared for equality; file-key ORDER is normalized
 * away, since two locks listing the same checksums pin the same contract regardless
 * of the order the keys were written in.
 * @param {import('./contract-lock.mjs').ContractLock | Record<string, any>} lock
 * @returns {string}
 */
function contentKey(lock) {
  return JSON.stringify({
    repo: lock.generatedFrom?.repo ?? null,
    sha: lock.generatedFrom?.sha ?? null,
    checksum: lock.generatedFrom?.checksum ?? null,
    generatorVersion: lock.generatorVersion ?? null,
    files: Object.entries(lock.files ?? {}).sort(([a], [b]) => a.localeCompare(b))
  })
}

/**
 * Builds the lock document from freshly computed checksums plus the lock already on
 * disk (if any).
 *
 * Two preservation rules make the generator idempotent outside a checkout that can
 * see mantle-LifegamesPortal:
 *
 *   1. `derivedSha === null` means "cannot RE-DERIVE the provenance sha", which is not
 *      the same as "there is no provenance sha". The previous sha is carried forward
 *      rather than overwritten — a regenerator must never downgrade a known provenance
 *      pin to null.
 *   2. When nothing else changed, the previous `generatedAt` is carried forward too, so
 *      a no-op regeneration produces byte-identical output instead of timestamp churn.
 *
 * @param {import('./contract-lock.mjs').BuildLockInput} input
 * @returns {import('./contract-lock.mjs').ContractLock}
 */
export function buildLock({previous, repo, derivedSha, checksum, files, generatorVersion, now}) {
  const lock = {generatedFrom: {repo, sha: derivedSha ?? previous?.generatedFrom?.sha ?? null, checksum}, generatedAt: now, generatorVersion, files}

  if (previous && typeof previous.generatedAt === 'string' && contentKey(previous) === contentKey(lock)) {
    lock.generatedAt = previous.generatedAt
  }

  return lock
}

/**
 * How `buildLock` arrived at the provenance sha it wrote — for the generator's report.
 * @param {string | null} derivedSha
 * @param {string | null} writtenSha
 * @returns {'derived' | 'preserved' | 'unknown'}
 */
export function provenanceOrigin(derivedSha, writtenSha) {
  if (derivedSha) {
    return 'derived'
  }
  return writtenSha ? 'preserved' : 'unknown'
}

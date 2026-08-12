// Type declarations for the plain-.mjs lock model so the tsx-run generate-contract-lock.ts
// consumes it with proper types instead of implicit `any` (same pattern as
// portal-contract-source.d.mts).

export interface ContractLock {
  generatedFrom: {repo: string; sha: string | null; checksum: string}
  generatedAt: string
  generatorVersion: string
  files: Record<string, string>
}

export interface BuildLockInput {
  /** The lock already on disk, or null when there is none (or it is unreadable). */
  previous: ContractLock | null
  repo: string
  /** The upstream sha resolved this run, or null when no upstream checkout was reachable. */
  derivedSha: string | null
  checksum: string
  files: Record<string, string>
  generatorVersion: string
  now: string
}

export function buildLock(input: BuildLockInput): ContractLock

export function provenanceOrigin(derivedSha: string | null, writtenSha: string | null): 'derived' | 'preserved' | 'unknown'

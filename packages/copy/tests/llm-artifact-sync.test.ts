import {describe, expect, it} from 'vitest'
import {readFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const PKG = join(HERE, '..')

/**
 * The llm namespace describes the same set of public CloudFront JSON artifacts three times:
 *
 *   - `txt.endpoint*`     — the llms.txt discovery index (CopyLink: {label, url, notes})
 *   - `full.stream*`      — the llms-full.txt Streams list (one rendered markdown bullet)
 *   - `mcp.ds*Name/Desc`  — the WebMCP + server-card data-source rows
 *
 * Nothing linked them, so a leaf could be added to one family and forgotten in the other two —
 * which is how `location.json` survived in all three long after the object stopped existing at
 * origin (atlas decision 0142 D1). These tests hold the three families to one artifact set.
 *
 * The families are deliberately NOT spelled alike: `endpointStarred` / `streamStarred` /
 * `dsStarredReposName` all describe `github-starred-repos.json`. So the key spelling is never
 * compared — every assertion is keyed on the artifact filename.
 */
describe('@j0nathan-ll0yd/copy llm endpoint/stream/data-source sync', () => {
  const llm = JSON.parse(readFileSync(join(PKG, 'dist', 'llm.flat.json'), 'utf-8')) as {
    txt: Record<string, unknown>
    full: Record<string, unknown>
    mcp: Record<string, unknown>
  }

  /** `{cloudfrontBase}/github-events.json` → `github-events.json`. */
  const ARTIFACT_RE = /\{cloudfrontBase\}\/([a-z0-9-]+\.json)/
  /** `streamHealth` yes, `streamsHeading` / `streamsBody` no — the group's own prose, not a row. */
  const STREAM_KEY_RE = /^stream[A-Z]/
  /** `dsStarredReposName` → stem `StarredRepos`, role `Name`. */
  const DATA_SOURCE_KEY_RE = /^ds(.+?)(Name|Desc)$/

  interface Row {
    key: string
    artifact: string | null
  }

  /** The artifact each row names, or null when the row carries no `{cloudfrontBase}/*.json` URL. */
  function rowsFrom(group: Record<string, unknown>, keyMatches: (key: string) => boolean, urlOf: (value: unknown) => string): Row[] {
    return Object.entries(group).filter(([key]) => keyMatches(key)).map(([key, value]) => ({key, artifact: ARTIFACT_RE.exec(urlOf(value))?.[1] ?? null}))
  }

  const endpoints = rowsFrom(llm.txt, (key) => key.startsWith('endpoint'),
    (value) => (value && typeof value === 'object' && 'url' in value ? String((value as {url: unknown}).url) : ''))
  const streams = rowsFrom(llm.full, (key) => STREAM_KEY_RE.test(key), (value) => String(value))

  /** `StarredRepos` → `starred-repos`, so a stem can be compared to an artifact basename. */
  function kebab(stem: string): string {
    return stem.replace(/(?<!^)(?=[A-Z])/g, '-').toLowerCase()
  }

  const dataSourceRoles = new Map<string, Set<string>>()
  const unparsedDataSourceKeys: string[] = []
  for (const key of Object.keys(llm.mcp)) {
    if (!key.startsWith('ds')) {
      continue
    }
    const match = DATA_SOURCE_KEY_RE.exec(key)
    if (!match) {
      unparsedDataSourceKeys.push(key)
      continue
    }
    const stem = kebab(match[1]!)
    const roles = dataSourceRoles.get(stem) ?? new Set<string>()
    roles.add(match[2]!)
    dataSourceRoles.set(stem, roles)
  }

  const endpointArtifacts = endpoints.map((row) => row.artifact)
  const streamArtifacts = streams.map((row) => row.artifact)

  it('every endpoint row names a {cloudfrontBase} JSON artifact', () => {
    expect(endpoints.filter((row) => row.artifact === null).map((row) => `txt.${row.key}`)).toEqual([])
    expect(endpoints.length).toBeGreaterThan(0)
  })

  it('every stream row names a {cloudfrontBase} JSON artifact', () => {
    expect(streams.filter((row) => row.artifact === null).map((row) => `full.${row.key}`)).toEqual([])
    expect(streams.length).toBeGreaterThan(0)
  })

  it('no artifact is listed twice within a family', () => {
    expect(endpointArtifacts.length).toBe(new Set(endpointArtifacts).size)
    expect(streamArtifacts.length).toBe(new Set(streamArtifacts).size)
  })

  it('the endpoint family and the stream family cover the same artifacts', () => {
    expect([...streamArtifacts].sort()).toEqual([...endpointArtifacts].sort())
  })

  it('every data-source key parses into a stem plus a Name/Desc role', () => {
    expect(unparsedDataSourceKeys.map((key) => `mcp.${key}`)).toEqual([])
  })

  it('every data source ships both a Name and a Desc', () => {
    const halfPairs = [...dataSourceRoles.entries()].filter(([, roles]) => !(roles.has('Name') && roles.has('Desc'))).map(([stem, roles]) =>
      `${stem}: only ${[...roles].sort().join(', ')}`
    )
    expect(halfPairs).toEqual([])
  })

  it('the data-source family covers the same artifacts as the endpoint family', () => {
    // A stem matches the artifact basename it is a suffix of, on a `-` boundary: `starred-repos`
    // matches `github-starred-repos.json`. Exactly one match is required in each direction, so an
    // ambiguous stem fails here rather than silently pairing with the wrong artifact.
    const bases = endpointArtifacts.filter((a): a is string => a !== null).map((artifact) => ({artifact, base: artifact.replace(/\.json$/, '')}))
    const ambiguous: string[] = []
    const paired = new Map<string, string>()
    for (const stem of [...dataSourceRoles.keys()].sort()) {
      const matches = bases.filter(({base}) => base === stem || base.endsWith(`-${stem}`))
      if (matches.length !== 1) {
        ambiguous.push(`data source "${stem}" (mcp.ds*Name/Desc): ${matches.length} matching artifacts${
          matches.length > 1
            ? ` (${matches.map((m) => m.artifact).join(', ')})`
            : ''
        }`)
        continue
      }
      paired.set(stem, matches[0]!.artifact)
    }
    expect(ambiguous).toEqual([])
    expect([...paired.values()].sort()).toEqual([...endpointArtifacts].sort())
  })
})

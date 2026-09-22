import {describe, expect, it} from 'vitest'
import {readFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const PKG = join(HERE, '..')

function readJson(p: string): unknown {
  return JSON.parse(readFileSync(p, 'utf-8'))
}

/**
 * `llm.full.systemFraming` describes the person. Those facts belong to the `identity` namespace, so
 * the framing line must BIND them, never restate them (atlas decision 0142, owner decision on
 * `systemFraming`).
 *
 * It used to hardcode "an engineering director and backend engineer". Two bindings were rejected
 * before the current one:
 *   - `{profileTitle}` → `identity.person.jobTitle` is title case ("Engineering Director"), so it
 *     renders "an Engineering Director" mid-sentence.
 *   - `{profileTitle}` / `jobTitle` also names only ONE of the two roles, so binding it silently
 *     drops "and backend engineer" from the published framing.
 *
 * The answer is a dedicated lowercase field, `identity.person.rolePhrase`, bound as
 * `{profileRolePhrase}`. `jobTitle` stays the canonical short title for JSON-LD and the profile line.
 */
describe('@j0nathan-ll0yd/copy llm identity binding', () => {
  const identity = readJson(join(PKG, 'src', 'identity.en-US.json')) as {person: Record<string, {value: unknown} | undefined>}
  const llm = readJson(join(PKG, 'src', 'llm.en-US.json')) as {full: {systemFraming: {value: string}}}

  const framing = llm.full.systemFraming.value
  const rolePhraseLeaf = identity.person['rolePhrase']

  /** `{profileName}` → `name`, `{profileRolePhrase}` → `rolePhrase`. The estate's binding convention. */
  function identityKeyFor(token: string): string | null {
    const match = /^profile([A-Z].*)$/.exec(token)
    if (!match) {
      return null
    }
    const rest = match[1]!
    return rest.charAt(0).toLowerCase() + rest.slice(1)
  }

  const framingTokens = [...framing.matchAll(/\{([A-Za-z0-9_]+)\}/g)].map((m) => m[1]!)

  it('the new identity leaf exists and holds a non-empty string', () => {
    expect(typeof rolePhraseLeaf?.value).toBe('string')
    expect(String(rolePhraseLeaf?.value ?? '')).not.toBe('')
  })

  it('the role phrase is lowercase, so it reads correctly mid-sentence', () => {
    const value = String(rolePhraseLeaf?.value ?? '')
    // Title case here is the exact bug that ruled out binding jobTitle: "an Engineering Director".
    expect(value.charAt(0)).toBe(value.charAt(0).toLowerCase())
  })

  it('systemFraming binds the role phrase instead of hardcoding it', () => {
    expect(framing).toContain('{profileRolePhrase}')
  })

  it('no llm leaf restates an identity.person value verbatim', () => {
    // The property, not the one sentence: any identity fact duplicated into llm copy drifts the
    // moment identity changes. Short values (initials, a handle fragment) would collide by accident,
    // so only substantial phrases are compared.
    const MIN_PHRASE_LENGTH = 24
    const personPhrases = Object.entries(identity.person).filter((entry): entry is [string, {value: string}] => typeof entry[1]?.value === 'string').filter((
      [, leaf]
    ) => leaf.value.length >= MIN_PHRASE_LENGTH)
    const llmLeaves = readJson(join(PKG, 'src', 'llm.en-US.json')) as Record<string, Record<string, {value: unknown}>>
    const duplicated: string[] = []
    for (const [group, leaves] of Object.entries(llmLeaves)) {
      for (const [key, leaf] of Object.entries(leaves)) {
        if (typeof leaf.value !== 'string') {
          continue
        }
        for (const [personKey, personLeaf] of personPhrases) {
          if (leaf.value.includes(personLeaf.value)) {
            duplicated.push(`${group}.${key} restates identity.person.${personKey}`)
          }
        }
      }
    }
    expect(duplicated).toEqual([])
  })

  it('every systemFraming placeholder resolves to an identity.person leaf', () => {
    expect(framingTokens.length).toBeGreaterThan(0)
    const unresolved = framingTokens.map((token) => ({token, key: identityKeyFor(token)})).filter(({key}) =>
      key === null || identity.person[key] === undefined
    ).map(({token}) => `{${token}} has no identity.person counterpart`)
    expect(unresolved).toEqual([])
  })

  it('substituting the identity value renders a grammatical mid-sentence phrase', () => {
    const rendered = framing.replace('{profileRolePhrase}', String(rolePhraseLeaf?.value ?? ''))
    expect(rendered).toContain(`— an ${String(rolePhraseLeaf?.value ?? '')}.`)
    expect(rendered).not.toContain('{profileRolePhrase}')
  })
})

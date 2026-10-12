// atlas decision 0160 Step 1.7: the baseline profile is READ from
// @j0nathan-ll0yd/copy, so the site's identity content and the fixture cannot drift.
import {identity, profile as profileCopy} from '@j0nathan-ll0yd/copy'
import {describe, expect, it} from 'vitest'
import {profilePostAdapter, terminalLinesFromCopy} from '../src/post-adapter/profile'

const {baseline} = profilePostAdapter

describe('baseline profile ⟵ @j0nathan-ll0yd/copy', () => {
  it('takes the identity facts from identity.person and the tagline from profile', () => {
    expect(baseline.name).toBe(identity.person.name)
    expect(baseline.title).toBe(identity.person.jobTitle)
    expect(baseline.location).toBe(identity.person.location)
    expect(baseline.bio).toBe(identity.person.flavorBio)
    expect(identity.person.sameAs).toContain(baseline.linkedin)
    expect(identity.person.sameAs).toContain(baseline.github)
    expect(new URL(baseline.linkedin!).hostname).toMatch(/linkedin\.com$/)
    expect(new URL(baseline.github!).hostname).toMatch(/github\.com$/)
    expect(baseline.tagline).toBe(profileCopy.tagline)
  })

  it('builds the terminal from the copy blocks: prompt, outputs, a blank between blocks, the cursor last', () => {
    const expected = Object.values(profileCopy.terminal).flatMap((block, i) => [
      ...(i > 0 ? [{type: 'blank', text: ''}] : []),
      {type: 'prompt', text: block[0]},
      ...block.slice(1).map((text) => ({type: 'output', text}))
    ])
    expect(baseline.terminalLines).toEqual([...expected, {type: 'cursor', text: ''}])
  })

  it('a block without a prompt line throws instead of rendering a malformed terminal', () => {
    expect(() => terminalLinesFromCopy({broken: []})).toThrow(/no prompt line/)
  })

  it('no variation carries coordinates (decision 0160 D14)', () => {
    for (const [name, variation] of Object.entries(profilePostAdapter)) {
      expect(variation, name).not.toHaveProperty('coordinates')
    }
  })
})

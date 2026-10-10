// The profile namespace (atlas decision 0160 Step 1.7): the bio terminal's
// command blocks follow one grammar, so a consumer can derive each line's role
// from its position: the first string of a block is the prompt ("$ "), every
// other string is an output line ("→ "). No empty string: the renderer adds the
// blank lines between blocks and the closing cursor.
import {describe, expect, it} from 'vitest'
import {profile} from '../dist/index'

describe('profile copy', () => {
  it('holds the tagline and the five terminal blocks, in display order', () => {
    expect(profile.tagline).not.toBe('')
    expect(Object.keys(profile.terminal)).toEqual(['gpg', 'stack', 'uptime', 'philosophy', 'interests'])
  })

  it.each(Object.entries(profile.terminal))('%s: a prompt line, then output lines', (_name, block) => {
    expect(block.length).toBeGreaterThanOrEqual(2)
    expect(block[0]).toMatch(/^\$ \S/)
    for (const line of block.slice(1)) {
      expect(line).toMatch(/^→ \S/)
    }
  })

  it('carries no coordinates or other location data beyond the identity namespace (decision 0160 D14)', () => {
    expect(JSON.stringify(profile)).not.toMatch(/-?\d{1,3}\.\d{3,}/)
  })
})

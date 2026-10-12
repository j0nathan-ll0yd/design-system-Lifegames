// Post-adapter display fixtures for the Profile widget (IdentityCard + BioTerminal).
//
// Profile is a DS-authored display shape with NO raw LP export equivalent — it is
// not produced by any runtime adapter. These fixtures are authored directly against
// `@j0nathan-ll0yd/schemas` `Profile` (authored/profile.schema.json) and feed the SSR
// shell via loadDashboardData. Runtime polling never overwrites profile (it is
// static identity content), so `baseline` is the representative production state.
//
// `baseline` is the real identity content, so it is READ from @j0nathan-ll0yd/copy
// (atlas decision 0160 Step 1.7) and cannot drift from it: name, title, location,
// the two profile links and the bio from `identity.person`; the tagline and the
// terminal blocks from `profile`. `empty` and `full` are synthetic stress
// variations and stay authored here. No variation carries `coordinates`: live and
// derived location data is out of scope for the public profile (decision 0160 D14),
// and no widget renders them.
import {identity, profile as profileCopy} from '@j0nathan-ll0yd/copy'
import type {Profile} from '@j0nathan-ll0yd/schemas'
import {authored} from './branded'

// The avatar is a site asset path, not authored copy: the site owns the file
// under public/assets, and IdentityCard renders its own <picture>.
const AVATAR = '/assets/avatar.webp'

type TerminalLine = Profile['terminalLines'][number]

/**
 * The bio terminal from the copy's command blocks: each block is its prompt line
 * then its output lines, blocks are separated by a blank line, in the copy's key
 * order, and the blinking cursor ends the sequence.
 */
export function terminalLinesFromCopy<T extends { readonly [K in keyof T]: readonly string[] }>(terminal: T): TerminalLine[] {
  // A mapped copy of the block map: an object type literal, so Object.values reads it.
  const blocks: { readonly [K in keyof T]: readonly string[] } = terminal
  const lines: TerminalLine[] = []
  Object.values<readonly string[]>(blocks).forEach((block, i) => {
    const [prompt, ...output] = block
    if (prompt === undefined) {
      throw new Error('profile copy: a terminal block has no prompt line')
    }
    if (i > 0) {
      lines.push({type: 'blank', text: ''})
    }
    lines.push({type: 'prompt', text: prompt})
    output.forEach((text) => lines.push({type: 'output', text}))
  })
  lines.push({type: 'cursor', text: ''})
  return lines
}

/** The profile link in identity.person.sameAs on the given host. */
function sameAs(host: string): string {
  const url = identity.person.sameAs.find((u) => new URL(u).hostname.endsWith(host))
  if (!url) {
    throw new Error(`identity copy: no ${host} link in person.sameAs`)
  }
  return url
}

export const baseline = authored<Profile>({
  name: identity.person.name,
  title: identity.person.jobTitle,
  location: identity.person.location,
  linkedin: sameAs('linkedin.com'),
  github: sameAs('github.com'),
  bio: identity.person.flavorBio,
  tagline: profileCopy.tagline,
  avatar: AVATAR,
  terminalLines: terminalLinesFromCopy(profileCopy.terminal)
})

// Minimal-but-valid profile: required fields only, single-line terminal, no
// optional contact links. Exercises the empty/sparse identity rendering path.
export const empty = authored<Profile>({
  name: 'Jonathan Lloyd',
  title: 'Engineering Director',
  location: 'San Francisco, CA',
  bio: 'Human datastream initializing.',
  tagline: 'Welcome to my human datastream.',
  avatar: AVATAR,
  terminalLines: [{type: 'cursor', text: ''}]
})

// Maximally populated: every optional field a profile may carry (linkedin, github),
// longest realistic strings, max terminal lines with all line types represented.
export const full = authored<Profile>({
  name: 'Jonathan Lloyd',
  title: 'Engineering Director, Platform Infrastructure & Developer Experience',
  location: 'San Francisco, CA',
  linkedin: 'https://www.linkedin.com/in/lifegames/',
  github: 'https://github.com/j0nathan-ll0yd',
  bio:
    '100% pure, old fashioned, home-grown human, born free right here in the real world. Building things that matter with code, creativity, and relentless curiosity.',
  tagline: 'Welcome to my human datastream — where technology meets the quantified self.',
  avatar: AVATAR,
  terminalLines: [
    // Same gpg-block constraints as baseline (see the gpg _meta.rationale in
    // @j0nathan-ll0yd/copy src/profile.en-US.json); the long uid
    // comment is exactly the longest-realistic-string stress this variation is for.
    {type: 'prompt', text: '$ gpg -k'},
    {type: 'output', text: '→ pub   rsa4096 2002-01-01 [SC]'},
    {type: 'output', text: '→ uid   Jonathan Lloyd (Engineering Director, Platform Infrastructure & Developer Experience)'},
    {type: 'blank', text: ''},
    {type: 'prompt', text: '$ printenv STACK'},
    {type: 'output', text: '→ aws typescript serverless swift go perl python rust'},
    {type: 'blank', text: ''},
    {type: 'prompt', text: '$ uptime'},
    {type: 'output', text: '→ up 24+ years professionally and counting'},
    {type: 'blank', text: ''},
    {type: 'prompt', text: '$ cat philosophy.txt'},
    {type: 'output', text: '→ "Creating things I\'m proud of"'},
    {type: 'output', text: '→ "Enjoying the passage of time"'},
    {type: 'blank', text: ''},
    // interests listed alphabetically — `ls` sorts (see the interests _meta.rationale in the copy).
    {type: 'prompt', text: '$ ls -m interests/'},
    {type: 'output', text: '→ conversation, edm, musical theatre, pc gaming, programming'},
    {type: 'blank', text: ''},
    {type: 'prompt', text: '$ cat projects.txt'},
    {type: 'output', text: '→ mantle — serverless infrastructure framework'},
    {type: 'output', text: '→ lifegames — personal data dashboard & design system'},
    {type: 'output', text: '→ coast to coast reviews — theatre criticism platform'},
    {type: 'blank', text: ''},
    {type: 'prompt', text: '$ echo $CURRENT_FOCUS'},
    {type: 'output', text: '→ building the human datastream with DTCG tokens and SwiftUI'},
    {type: 'cursor', text: ''}
  ]
})

export const profilePostAdapter = {baseline, empty, full}

// Post-adapter display fixtures for the Profile widget (IdentityCard + BioTerminal).
//
// Profile is a DS-authored display shape with NO raw LP export equivalent — it is
// not produced by any runtime adapter. These fixtures are authored directly against
// `@lifegames/schemas` `Profile` (authored/profile.schema.json) and feed the SSR
// shell via loadDashboardData. Runtime polling never overwrites profile (it is
// static identity content), so `baseline` is the representative production state.
import type { Profile } from '@lifegames/schemas';
import { authored } from './branded';

export const baseline = authored<Profile>({
  name: 'Jonathan Lloyd',
  title: 'Engineering Director',
  location: 'San Francisco, CA',
  coordinates: [37.7749, -122.4194],
  linkedin: 'https://www.linkedin.com/in/lifegames/',
  github: 'https://github.com/j0nathan-ll0yd',
  bio: '100% pure, old fashioned, home-grown human, born free right here in the real world.',
  tagline: 'Welcome to my human datastream.',
  avatar: '/assets/avatar.webp',
  terminalLines: [
    // gpg block: rsa4096 is period-accurate (RSA in GnuPG since 1999); an ed25519
    // key dated 2002 would be an anachronism (ECC keygen landed in GnuPG 2.1.8,
    // 2015). `-k` is the documented `--list-keys` shorthand and prints no
    // fingerprint line by default; the uid validity tag is deliberately omitted
    // (`--list-options no-show-uid-validity` output) so the line fits unwrapped.
    // Key date = career epoch, rhyming with the uptime line's 24+ years.
    { type: 'prompt', text: '$ gpg -k' },
    { type: 'output', text: '→ pub   rsa4096 2002-01-01 [SC]' },
    { type: 'output', text: '→ uid   Jonathan Lloyd (Engineering Director)' },
    { type: 'blank', text: '' },
    { type: 'prompt', text: '$ printenv STACK' },
    { type: 'output', text: '→ aws typescript serverless swift go perl' },
    { type: 'blank', text: '' },
    { type: 'prompt', text: '$ uptime' },
    { type: 'output', text: '→ up 24+ years professionally and counting' },
    { type: 'blank', text: '' },
    { type: 'prompt', text: '$ cat philosophy.txt' },
    { type: 'output', text: '→ "Creating things I\'m proud of"' },
    { type: 'output', text: '→ "Enjoying the passage of time"' },
    { type: 'blank', text: '' },
    // interests listed alphabetically — `ls` always sorts. Order intentionally
    // differs from @lifegames/copy interests.value (curated; feeds llms-full.txt via
    // llm-content/view.ts). Enforced by tests/interests-invariant.test.ts.
    { type: 'prompt', text: '$ ls -m interests/' },
    { type: 'output', text: '→ conversation, edm, musical theatre, pc gaming, programming' },
    { type: 'cursor', text: '' },
  ],
});

// Minimal-but-valid profile: required fields only, single-line terminal, no
// optional contact links. Exercises the empty/sparse identity rendering path.
export const empty = authored<Profile>({
  name: 'Jonathan Lloyd',
  title: 'Engineering Director',
  location: 'San Francisco, CA',
  bio: 'Human datastream initializing.',
  tagline: 'Welcome to my human datastream.',
  avatar: '/assets/avatar.webp',
  terminalLines: [{ type: 'cursor', text: '' }],
});

// Maximally populated: all optional fields present (coordinates, linkedin, github),
// longest realistic strings, max terminal lines with all line types represented.
export const full = authored<Profile>({
  name: 'Jonathan Lloyd',
  title: 'Engineering Director, Platform Infrastructure & Developer Experience',
  location: 'San Francisco, CA',
  coordinates: [37.7749, -122.4194],
  linkedin: 'https://www.linkedin.com/in/lifegames/',
  github: 'https://github.com/j0nathan-ll0yd',
  bio: '100% pure, old fashioned, home-grown human, born free right here in the real world. Building things that matter with code, creativity, and relentless curiosity.',
  tagline: 'Welcome to my human datastream — where technology meets the quantified self.',
  avatar: '/assets/avatar.webp',
  terminalLines: [
    // Same gpg-block constraints as baseline (see comment there); the long uid
    // comment is exactly the longest-realistic-string stress this variation is for.
    { type: 'prompt', text: '$ gpg -k' },
    { type: 'output', text: '→ pub   rsa4096 2002-01-01 [SC]' },
    {
      type: 'output',
      text: '→ uid   Jonathan Lloyd (Engineering Director, Platform Infrastructure & Developer Experience)',
    },
    { type: 'blank', text: '' },
    { type: 'prompt', text: '$ printenv STACK' },
    { type: 'output', text: '→ aws typescript serverless swift go perl python rust' },
    { type: 'blank', text: '' },
    { type: 'prompt', text: '$ uptime' },
    { type: 'output', text: '→ up 24+ years professionally and counting' },
    { type: 'blank', text: '' },
    { type: 'prompt', text: '$ cat philosophy.txt' },
    { type: 'output', text: '→ "Creating things I\'m proud of"' },
    { type: 'output', text: '→ "Enjoying the passage of time"' },
    { type: 'blank', text: '' },
    // interests listed alphabetically — `ls` sorts (see baseline note above).
    { type: 'prompt', text: '$ ls -m interests/' },
    { type: 'output', text: '→ conversation, edm, musical theatre, pc gaming, programming' },
    { type: 'blank', text: '' },
    { type: 'prompt', text: '$ cat projects.txt' },
    { type: 'output', text: '→ mantle — serverless infrastructure framework' },
    { type: 'output', text: '→ lifegames — personal data dashboard & design system' },
    { type: 'output', text: '→ coast to coast reviews — theatre criticism platform' },
    { type: 'blank', text: '' },
    { type: 'prompt', text: '$ echo $CURRENT_FOCUS' },
    { type: 'output', text: '→ building the human datastream with DTCG tokens and SwiftUI' },
    { type: 'cursor', text: '' },
  ],
});

export const profilePostAdapter = { baseline, empty, full };

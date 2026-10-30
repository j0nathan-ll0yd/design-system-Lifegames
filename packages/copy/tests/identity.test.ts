import {describe, expect, it} from 'vitest'
import {readFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import {_Parser} from '@formatjs/icu-messageformat-parser'

const HERE = dirname(fileURLToPath(import.meta.url))
const PKG = join(HERE, '..')

const ajv = new Ajv({allErrors: true, strict: false})
addFormats(ajv)

/** Parse an ICU MF1 string without throwing: returns { val, err }. */
function parseMF1(message: string) {
  return new _Parser(message, {requiresOtherClause: false, ignoreTag: true}).parse()
}

interface Leaf {
  path: string
  values: string[]
  maxChars?: number
}

/**
 * Every string one leaf's `value` holds. A CopyLink leaf's value is a field OBJECT, so its
 * label/url/notes are collected individually — each is authored prose or an ICU MF1 template in
 * its own right, and without this branch all three would skip the MF1 and maxChars assertions.
 */
function leafValues(value: unknown): string[] {
  if (typeof value === 'string') {
    return [value]
  }
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string')
  }
  if (value && typeof value === 'object') {
    return Object.values(value).filter((v): v is string => typeof v === 'string')
  }
  return []
}

function collectLeaves(node: unknown, path: string, out: Leaf[]): void {
  if (
    node && typeof node === 'object' && !Array.isArray(node) && 'value' in node && '_meta' in node
  ) {
    const leaf = node as {value: unknown; _meta?: {constraints?: {maxChars?: number}}}
    out.push({path, values: leafValues(leaf.value), maxChars: leaf._meta?.constraints?.maxChars})
    return
  }
  if (node && typeof node === 'object' && !Array.isArray(node)) {
    for (const [key, value] of Object.entries(node)) {
      collectLeaves(value, path ? `${path}.${key}` : key, out)
    }
  }
}

function readJson(p: string): unknown {
  return JSON.parse(readFileSync(p, 'utf-8'))
}

/** One namespace's authoring + generated artifacts, plus its expected leaf count. */
interface NamespaceFixture {
  name: string
  /** Sanity leaf count. */
  expectedLeaves: number
}

const NAMESPACES: NamespaceFixture[] = [
  // identity: person 21 (name/firstName/lastName/handle/jobTitle/rolePhrase/employer/employerUrl/alumniOf/alumniOfUrl/location/yearsExperience/philosophy/skills/interests/sameAs/shortBio/socialBio/longBio/flavorBio/experiencePhrase) + site 5 + seo 4 + a11y 2 + humansTxt 4 + feed 9 (title/description/author/copyright + sections.*5) + privacy 16 (title/lastUpdated/lastUpdatedLabel/backLink/whoHeading/dataDisplayedHeading/dataCollectedHeading/analyticsHeading/rightsHeading/changesHeading/who/dataDisplayed/dataCollected/analytics/rights/changes).
  //   person gained rolePhrase — the lowercase mid-sentence role noun phrase llm.full.systemFraming binds.
  //   person gained email/contactType/addressLocality/addressRegion/addressCountry (Person JSON-LD
  //   contactPoint + address), plus about 9 (title/metaDescription + 4 headings + 3 bodies; the
  //   background body reuses person.longBio) and
  //   contact 12 (title/metaDescription/intro/channelsHeading + 3 label/note pairs +
  //   securityHeading/security) — atlas decision 0158.
  //   privacy, about, and contact each gained lastModified (the sitemap <lastmod> date).
  //   navigation 1 (backLink, page-neutral; privacy.backLink stays, deprecated) — atlas decision 0158 step 5b.
  //   navigation gained siteNavLabel (the SiteFooterNav landmark name) — plan is-agentic-developers-link.
  //   organization 9 (name/description/contactType/contactEmail/poBox/locality/region/postalCode/country)
  //   — the schema.org Organization node for Lifegames (owner decision 2026-10-24).
  //   person gained securityEmail (the first security.txt Contact) and contact gained the 9
  //   vulnerability-disclosure policy leaves (securityScope/securityReport/securityReportAlternate/
  //   securityEncryption/securityInclude/securitySafeHarbor/securityExclusions/securityBounty/
  //   securityResponse); contact.security stays, deprecated — atlas decision 0175.
  //   contact gained securityThirdParty and securityDisclosure (owner rulings 2026-10-30).
  {name: 'identity', expectedLeaves: 113},
  // widgets: heartRate 20 + movement 18 + workouts 10 + hydration 4 + nightSummary 9
  //   + exploration 5 + topPlaces 2 + readingFeed 3 + bookshelf 9 + theatreReviews 2
  //   + bookModal 8 + devLog 3 + starredRepos 3 + bio 3 + identityCard 5
  //   + systemStatus 4 (title/valueActive/valueOffline/timestampRealtime)
  //   + systemStatus.sources 23 — each source is a structured {body, refs} pair
  //     (body CopyString + one label/href CopyString pair per link ref):
  //     health 7 (body + watch/water/coffee ×2) + sleep 3 (body + watch ×2)
  //     + books 1 (body, no refs) + articles 3 (body + feedly ×2)
  //     + githubEvents 3 (body + github ×2) + starredRepos 3 (body + github ×2)
  //     + theatreReviews 3 (body + squarespace ×2)
  //   + coffee 21 (sipping/caffeineUnit/thisCup/dailyLabel/searching + action ×4
  //     [connect/reconnect/finishCup/newCup] + badge ×3 [connect/connected/error]
  //     + status ×6 [offline/streamPaused/reconnectFailed/reconnectFailedTracked/
  //     bluetoothUnavailable/bluetoothDenied] + beverage ×3 [drip/espresso/coldBrew]).
  //   heartRate and movement each gained +4 paused leaves (label/labelCharging/description/descriptionCharging).
  {name: 'widgets', expectedLeaves: 157},
  // a11y: movement 2 + identity 2 + bookshelf 1 + bookModal 1 + modal 1
  //   + readingFeed 1 + nav 2 + region 2 + clock 1 + page404 1
  //   + coffee 9 (mug/caffeineThisCup/dailyCaffeine + action ×5
  //     [connect/searching/reconnect/finishCup/newCup] + connectionStatus).
  {name: 'a11y', expectedLeaves: 23},
  // app: nav 10 + common 7 + home 12 + settings 45 + savedPlaces 4
  //   + addPlace 9 + health 9 + sleep 8 + location 73 + bookshelf 54 + watch 12
  //   + sections 2 + page404 2.
  //   settings gained tokenVerification.{verify,valid,invalid,unreachable} —
  //   the API token-verification affordance (atlas decision 0151 Phase 5).
  {name: 'app', expectedLeaves: 247},
  // permissions: health 2 + locationWhenInUse 2 + locationAlways 1 + motion 1.
  {name: 'permissions', expectedLeaves: 6},
  // profile: tagline 1 + terminal 5 (gpg/stack/uptime/philosophy/interests).
  {name: 'profile', expectedLeaves: 6},
  // errors: validation 2 + client 2.
  {name: 'errors', expectedLeaves: 4},
  // llm: txt 36 + full 99 + dashboard 3 + mcp 32 + agentDiscovery 6 + developers 21 + notFound 6.
  //   atlas decision 0158: txt gained linkSourceRepo + the When-to-use heading/body/4 links, mcp
  //   gained serverTitle/serverCardDescription, agentDiscovery lost the 7 orphaned A2A leaves, and
  //   developers (title/metaDescription/intro/apiSuppressedResponse + 8 heading/body
  //   pairs) and notFound are new.
  //   developers gained lastModified (the sitemap <lastmod> date). mcp gained coarsenedBandDesc
  //   (the get_data_sources description for health, sleep, and workouts).
  //   Owner decision 2026-10-12: txt lost endpointHealth/endpointSleep/endpointWorkouts and full
  //   lost streamHealth/streamSleep/streamWorkouts — no LLM-facing file links the raw health exports.
  //   Plan is-agentic-api-v1 step 1: developers gained apiBaseNote, the errors, versioning, and
  //   rateLimit heading/body pairs, and a Title and a Detail for each of the five problem types (17).
  {name: 'llm', expectedLeaves: 220}
]

for (const ns of NAMESPACES) {
  const richSchema = readJson(join(PKG, 'schema', `${ns.name}.schema.json`))
  const richInstance = readJson(join(PKG, 'src', `${ns.name}.en-US.json`))
  const flatSchema = readJson(join(PKG, 'dist', `${ns.name}.flat.schema.json`))
  const flatInstance = readJson(join(PKG, 'dist', `${ns.name}.flat.json`))

  const leaves: Leaf[] = []
  collectLeaves(richInstance, '', leaves)

  describe(`@j0nathan-ll0yd/copy ${ns.name}`, () => {
    it('rich instance validates against the rich schema', () => {
      const validate = ajv.compile(richSchema as object)
      const ok = validate(richInstance)
      expect(validate.errors ?? null).toBeNull()
      expect(ok).toBe(true)
    })

    it('derived flat schema validates the flat instance (round-trip)', () => {
      const validate = ajv.compile(flatSchema as object)
      const ok = validate(flatInstance)
      expect(validate.errors ?? null).toBeNull()
      expect(ok).toBe(true)
    })

    it(`captures the full ${ns.name} surface`, () => {
      expect(leaves.length).toBe(ns.expectedLeaves)
    })

    it('every string value is valid ICU MessageFormat 1', () => {
      const failures: string[] = []
      for (const leaf of leaves) {
        for (const value of leaf.values) {
          const result = parseMF1(value)
          if (result.err) {
            failures.push(`${leaf.path}: ${result.err.message} — "${value}"`)
          }
        }
      }
      expect(failures).toEqual([])
    })

    it('every maxChars constraint is satisfied', () => {
      const failures: string[] = []
      for (const leaf of leaves) {
        if (leaf.maxChars == null) {
          continue
        }
        for (const value of leaf.values) {
          if (value.length > leaf.maxChars) {
            failures.push(`${leaf.path}: ${value.length} > maxChars ${leaf.maxChars} — "${value}"`)
          }
        }
      }
      expect(failures).toEqual([])
    })
  })
}

describe('@j0nathan-ll0yd/copy llm txt surface', () => {
  // The llms.txt consumer models the document structurally and its codec re-adds every markdown
  // affix, so a `txt` leaf that ships one gets regex-parsed straight back off (atlas decision 0128
  // P3a). The CopyHeading/CopyLink `pattern`s hold the MIGRATED keys; this holds the whole group,
  // so a NEW key added back as a rendered CopyString bullet or heading fails here.
  const RENDERED_LINK_RE = /^\s*[-*+]\s+\[/
  const RENDERED_HEADING_RE = /^\s*#{1,6}\s/

  it('no txt leaf ships a rendered markdown link or heading affix', () => {
    const txt = (readJson(join(PKG, 'dist', 'llm.flat.json')) as {txt: Record<string, unknown>}).txt
    const offenders: string[] = []
    for (const [key, value] of Object.entries(txt)) {
      for (const str of leafValues(value)) {
        if (RENDERED_LINK_RE.test(str) || RENDERED_HEADING_RE.test(str)) {
          offenders.push(`txt.${key}: ${JSON.stringify(str)}`)
        }
      }
    }
    expect(offenders).toEqual([])
  })

  it('every txt link ships as {label, url} fields', () => {
    const txt = (readJson(join(PKG, 'dist', 'llm.flat.json')) as {txt: Record<string, unknown>}).txt
    const links = Object.entries(txt).filter(([, v]) => v !== null && typeof v === 'object')
    expect(links.length).toBe(19)
    for (const [key, value] of links) {
      expect({key, ...(value as object)}).toMatchObject({key, label: expect.any(String), url: expect.any(String)})
    }
  })
})

/**
 * The hosting strings name Cloudflare Workers (atlas decision 0160 Step 1.7). Readers: website
 * src/pages/humans.txt.ts and scripts/generate-webmcp.mjs; LP render.ts and llms-txt.eta.
 */
describe('@j0nathan-ll0yd/copy hosting strings', () => {
  const identity = readJson(join(PKG, 'dist', 'identity.flat.json')) as {humansTxt: {hosting: string}}
  const llm = readJson(join(PKG, 'dist', 'llm.flat.json')) as {txt: {technologyHosting: string}; mcp: {stackHosting: string}}

  it('every hosting string names Cloudflare Workers', () => {
    expect(identity.humansTxt.hosting).toBe('Cloudflare Workers')
    expect(llm.txt.technologyHosting).toBe('- Hosting: Cloudflare Workers via GitHub Actions')
    expect(llm.mcp.stackHosting).toBe('Cloudflare Workers via GitHub Actions')
  })

  it('no copy string in any namespace still claims Cloudflare Pages', () => {
    for (const ns of NAMESPACES) {
      const leaves: Leaf[] = []
      collectLeaves(readJson(join(PKG, 'src', `${ns.name}.en-US.json`)), '', leaves)
      expect(leaves.length).toBeGreaterThan(0)
      const offenders = leaves.filter((l) => l.values.some((v) => /cloudflare\s+pages|pages\.dev/i.test(v))).map((l) => `${ns.name}.${l.path}`)
      expect(offenders).toEqual([])
    }
  })
})

describe('@j0nathan-ll0yd/copy cross-namespace invariants', () => {
  it('the $defs block is byte-identical across every schema (inlined per file, no cross-file $ref)', () => {
    const defs = NAMESPACES.map((ns) => {
      const schema = readJson(join(PKG, 'schema', `${ns.name}.schema.json`)) as Record<
        string,
        unknown
      >
      return JSON.stringify(schema['$defs'])
    })
    for (let i = 1; i < defs.length; i++) {
      expect(defs[i]).toBe(defs[0])
    }
  })
})

// atlas decision 0158 step 5b: the website's text pages, /offline and /500 read a
// page-neutral back link. The privacy-page key they used stays until the next
// major, deprecated, and names its replacement in every generated artifact.
describe('@j0nathan-ll0yd/copy page-neutral back link', () => {
  const flat = readJson(join(PKG, 'dist', 'identity.flat.json')) as {navigation: {backLink: string}; privacy: {backLink: string}}
  const flatSchema = readJson(join(PKG, 'dist', 'identity.flat.schema.json')) as {
    properties: Record<string, {properties: Record<string, {deprecated?: boolean; description?: string}>}>
  }
  const ts = readFileSync(join(PKG, 'dist', 'identity.ts'), 'utf8')
  const zod = readFileSync(join(PKG, 'dist', 'identity.zod.ts'), 'utf8')

  it('navigation.backLink carries the text privacy.backLink carries', () => {
    expect(flat.navigation.backLink).toBe('Back to dashboard')
    expect(flat.privacy.backLink).toBe(flat.navigation.backLink)
  })

  it('privacy.backLink is deprecated in favour of navigation.backLink in the flat schema, TS and Zod', () => {
    const old = flatSchema.properties.privacy!.properties.backLink!
    expect(old.deprecated).toBe(true)
    expect(old.description).toContain('use `identity.navigation.backLink` instead')
    expect(ts).toMatch(/\* @deprecated\s*\* Deprecated: use `identity\.navigation\.backLink` instead\.[^/]*\*\/\s*backLink: string;/)
    expect(zod).toMatch(/backLink: z\s*\.string\(\)\s*\.describe\(\s*'Deprecated: use `identity\.navigation\.backLink` instead\./)
  })

  it('navigation.backLink is not deprecated', () => {
    expect(flatSchema.properties.navigation!.properties.backLink!.deprecated).toBeUndefined()
  })
})

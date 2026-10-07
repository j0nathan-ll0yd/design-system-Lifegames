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
 * The copy behind the agent-readiness surfaces of the website (atlas decision 0158): the MCP
 * server card, the /about, /contact and /developers pages, and the markdown 404 body.
 *
 * Every assertion reads the FLAT instance consumers ship (dist/), and each pins a property the
 * contract states, not today's wording: a reword that keeps the property passes, and one that
 * breaks it fails here before a consumer renders it.
 */
describe('@j0nathan-ll0yd/copy agent-readiness copy (atlas decision 0158)', () => {
  const identity = readJson(join(PKG, 'dist', 'identity.flat.json')) as {
    person: Record<string, string | string[]>
    about: Record<string, string>
    contact: Record<string, string>
    privacy: Record<string, string>
  }
  const llm = readJson(join(PKG, 'dist', 'llm.flat.json')) as {
    mcp: Record<string, string>
    agentDiscovery: Record<string, unknown>
    developers: Record<string, string>
    notFound: Record<string, unknown>
  }
  const person = identity.person as Record<string, string>

  /** SEP-2127 caps the server-card `description` at 100 characters. */
  const SEP_2127_DESCRIPTION_MAX = 100
  /** The contract's floor for the visible text of /about and /contact. */
  const PAGE_MIN_VISIBLE_CHARS = 500
  /** The contract's floor for the markdown 404 paragraph. */
  const NOT_FOUND_BODY_MIN_CHARS = 20

  it('the server-card description fits the SEP-2127 100-character limit', () => {
    const description = llm.mcp['serverCardDescription'] ?? ''
    expect(description.length).toBeGreaterThan(0)
    expect(description.length).toBeLessThanOrEqual(SEP_2127_DESCRIPTION_MAX)
  })

  it('no MCP description still routes the server through CloudFront', () => {
    // The removed claim: the old card pointed at the CloudFront distribution, which answers an MCP
    // initialize with an HTML 403.
    for (const value of [llm.mcp['serverDescription'], llm.mcp['serverCardDescription'], llm.agentDiscovery['aiCatalogMcpDescription']]) {
      expect(String(value)).not.toMatch(/cloudfront/i)
    }
  })

  it('stackFramework is a template the website fills with the installed Astro major', () => {
    const value = llm.mcp['stackFramework'] ?? ''
    expect(value).toContain('{astroMajor}')
    expect(value).not.toMatch(/Astro \d/)
  })

  it('no orphaned A2A leaf survives in agentDiscovery', () => {
    expect(Object.keys(llm.agentDiscovery).filter((key) => /^agentCard|A2a/.test(key))).toEqual([])
  })

  it('every identity leaf that names an email address names person.email', () => {
    const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g
    const mismatches: string[] = []
    for (const [group, leaves] of Object.entries(identity)) {
      for (const [key, value] of Object.entries(leaves)) {
        for (const str of Array.isArray(value) ? value : [value]) {
          for (const match of String(str).matchAll(EMAIL_RE)) {
            if (match[0] !== person['email']) {
              mismatches.push(`${group}.${key}: ${match[0]}`)
            }
          }
        }
      }
    }
    expect(person['email']).toMatch(EMAIL_RE)
    expect(mismatches).toEqual([])
  })

  it('the PostalAddress parts recompose person.location', () => {
    expect(`${person['addressLocality']}, ${person['addressRegion']}`).toBe(person['location'])
    expect(person['addressCountry']).toMatch(/^[A-Z]{2}$/)
  })

  it('the about prose states the same role, city, experience, employer, and school as person', () => {
    expect(identity.about['metaDescription']).toContain(person['rolePhrase'])
    expect(identity.about['metaDescription']).toContain(person['addressLocality'])
    expect(identity.about['metaDescription']).toContain(person['yearsExperience'])
    expect(identity.about['work']).toContain(person['jobTitle'])
    expect(identity.about['work']).toContain(person['employer'])
    expect(identity.about['work']).toContain(person['alumniOf'])
  })

  it('the contact email note matches the Person contactType', () => {
    expect(identity.contact['emailNote']?.toLowerCase()).toContain(person['contactType'])
  })

  it('/about copy carries at least 500 visible characters', () => {
    // Headings, bodies, and the reused person.longBio — the meta description is not visible text.
    const a = identity.about
    const visible = [
      a['title'],
      a['backgroundHeading'],
      person['longBio'],
      a['workHeading'],
      a['work'],
      a['siteHeading'],
      a['site'],
      a['outsideHeading'],
      a['outside']
    ]
    expect(visible.join('').length).toBeGreaterThanOrEqual(PAGE_MIN_VISIBLE_CHARS)
  })

  it('/contact copy carries at least 500 visible characters', () => {
    const c = identity.contact
    const visible = [
      c['title'],
      c['intro'],
      c['channelsHeading'],
      c['emailLabel'],
      person['email'],
      c['emailNote'],
      c['linkedinLabel'],
      c['linkedinNote'],
      c['githubLabel'],
      c['githubNote'],
      c['securityHeading'],
      c['security']
    ]
    expect(visible.join('').length).toBeGreaterThanOrEqual(PAGE_MIN_VISIBLE_CHARS)
  })

  it('every developers section has both a heading and a body', () => {
    const keys = Object.keys(llm.developers)
    const stems = new Set(keys.filter((key) => /(Heading|Body)$/.test(key)).map((key) => key.replace(/(Heading|Body)$/, '')))
    const halfPairs = [...stems].filter((stem) => !(keys.includes(`${stem}Heading`) && keys.includes(`${stem}Body`)))
    expect(stems.size).toBe(8)
    expect(halfPairs).toEqual([])
  })

  it('the focus section names both suppression answers', () => {
    // The CloudFront data host answers a suppressed JSON export with 403
    // (mantle-LifegamesPortal src/edge/focus-gate.js); the website proxy answers its on-domain
    // routes with 503 and Retry-After (functions/_lib/proxy.ts). An agent meets both.
    expect(llm.developers['focusBody']).toContain('HTTP 403')
    expect(llm.developers['focusBody']).toContain('HTTP 503')
    expect(llm.developers['focusBody']).toContain('Retry-After')
  })

  it('the OpenAPI 403 description carries no ICU brace and states that no data is returned', () => {
    const value = llm.developers['apiSuppressedResponse'] ?? ''
    expect(value).not.toMatch(/[{}]/)
    expect(value).toContain('suppressed: true')
  })

  it('the developers usage terms restate the site Content-Usage header verbatim', () => {
    expect(llm.developers['usageBody']).toContain('Content-Usage: train-ai=n, search=y')
  })

  it('the markdown 404 body is at least 20 characters and links the four agent entry points', () => {
    expect(String(llm.notFound['body']).length).toBeGreaterThanOrEqual(NOT_FOUND_BODY_MIN_CHARS)
    const urls = Object.values(llm.notFound).filter((v): v is {url: string} => v !== null && typeof v === 'object').map((v) => v.url)
    expect(urls.sort()).toEqual(['{siteUrl}/developers', '{siteUrl}/index.md', '{siteUrl}/llms.txt', '{siteUrl}/sitemap-index.xml'])
  })
})

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
    site: Record<string, string>
    about: Record<string, string>
    contact: Record<string, string>
    privacy: Record<string, string>
  }
  const llm = readJson(join(PKG, 'dist', 'llm.flat.json')) as {
    txt: Record<string, unknown>
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
    expect(Object.keys(llm.agentDiscovery).filter((key) => /^(agentCard|aiCatalogA2a)/.test(key))).toEqual([])
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

  it('the about work line names every person.skills token and no other language', () => {
    // The work line restates the skills list; it must not drop one or add a stack the source does
    // not state. Whole-word, case-insensitive: "aws" in skills, "AWS" in prose, and a short token
    // such as "go" must not match inside another word.
    const work = identity.about['work'] ?? ''
    const skills = identity.person['skills'] as string[]
    const namesWord = (word: string): boolean =>
      new RegExp(`(?<![A-Za-z0-9#+])${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![A-Za-z0-9#+])`, 'i').test(work)
    expect(skills.filter((skill) => !namesWord(skill))).toEqual([])
    const LANGUAGES_NOT_IN_SKILLS = ['python', 'java', 'rust', 'ruby', 'kotlin', 'c#', 'php', 'javascript']
    expect(LANGUAGES_NOT_IN_SKILLS.filter((language) => namesWord(language) && !skills.includes(language))).toEqual([])
  })

  it('the When-to-use and source-repository links point at the contract URLs', () => {
    const urlOf = (key: string): string => (llm.txt[key] as {url: string}).url
    expect({
      whenToUseMcp: urlOf('whenToUseMcp'),
      whenToUseFull: urlOf('whenToUseFull'),
      whenToUseApi: urlOf('whenToUseApi'),
      whenToUseDevelopers: urlOf('whenToUseDevelopers'),
      linkSourceRepo: urlOf('linkSourceRepo')
    }).toEqual({
      whenToUseMcp: '{siteUrl}/mcp',
      whenToUseFull: '{siteUrl}/llms-full.txt',
      whenToUseApi: '{siteUrl}/openapi.json',
      whenToUseDevelopers: '{siteUrl}/developers',
      // {profileGithub} is https://github.com/j0nathan-ll0yd (identity.person.sameAs[1]).
      linkSourceRepo: '{profileGithub}/j0nathan-ll0yd.github.io'
    })
    expect((identity.person['sameAs'] as string[])[1]).toBe('https://github.com/j0nathan-ll0yd')
  })

  it('the MCP server title is the site name', () => {
    expect(llm.mcp['serverTitle']).toBe(identity.site['name'])
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
    // Eight machine interfaces plus the /api/v1 errors, versioning and rateLimit sections.
    expect(stems.size).toBe(11)
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

  it('the focus section names the /api/v1 problem answer beside the data-host 403', () => {
    expect(llm.developers['focusBody']).toContain('/api/v1')
    expect(llm.developers['focusBody']).toContain('focus-suppressed problem document')
  })

  it('the API section names the /api/v1 base and the OpenAPI document as {siteUrl} templates', () => {
    expect(llm.developers['apiBaseNote']).toContain('{siteUrl}/api/v1')
    expect(llm.developers['apiBaseNote']).toContain('{siteUrl}/openapi.json')
    expect(llm.developers['apiBody']).toContain('/api/v1')
    expect(llm.developers['apiBody']).toContain('{siteUrl}/openapi.json')
    // Every URL is a template: no literal host in any developers value.
    expect(Object.entries(llm.developers).filter(([, v]) => /https?:\/\/|cloudfront\.net|jonathanlloyd\.me/i.test(v)).map(([k]) => k)).toEqual([])
  })

  /** The /api/v1 problem types (plan is-agentic-api-v1): one Title and one Detail key per slug. */
  const PROBLEM_STEMS = ['NotFound', 'MethodNotAllowed', 'RateLimited', 'FocusSuppressed', 'UpstreamUnavailable']

  it('every problem type has exactly a Title and a Detail, and no other problem key exists', () => {
    const problemKeys = Object.keys(llm.developers).filter((key) => key.startsWith('problem')).sort()
    expect(problemKeys).toEqual(PROBLEM_STEMS.flatMap((stem) => [`problem${stem}Detail`, `problem${stem}Title`]).sort())
  })

  it('problem titles are short labels and problem details are static sentences', () => {
    for (const stem of PROBLEM_STEMS) {
      const title = llm.developers[`problem${stem}Title`] ?? ''
      const detail = llm.developers[`problem${stem}Detail`] ?? ''
      expect(title, stem).toMatch(/^[A-Z][^.]*[^.\s]$/)
      expect(detail, stem).toMatch(/\.$/)
      // RFC 9457 detail is static here: variable data travels in extension members and headers.
      // The only placeholder allowed is the site base URL.
      expect(detail.replaceAll('{siteUrl}', ''), stem).not.toMatch(/[{}]/)
    }
  })

  it('each problem detail names the member or header that carries its variable data', () => {
    expect(llm.developers['problemNotFoundDetail']).toContain('validPaths')
    expect(llm.developers['problemMethodNotAllowedDetail']).toContain('Allow header')
    // Method-neutral: /api/csp-report (POST only) answers the same problem as the GET/HEAD /api/v1 paths.
    expect(llm.developers['problemMethodNotAllowedDetail']).not.toMatch(/\b(GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS)\b/)
    expect(llm.developers['problemRateLimitedDetail']).toContain('Retry-After')
    expect(llm.developers['problemFocusSuppressedDetail']).toContain('suppressed: true')
    expect(llm.developers['problemFocusSuppressedDetail']).toContain('Retry-After')
    expect(llm.developers['problemUpstreamUnavailableDetail']).toContain('Retry-After')
  })

  it('the errors section names RFC 9457, the media type, and the five members', () => {
    const body = llm.developers['errorsBody'] ?? ''
    expect(body).toContain('RFC 9457')
    expect(body).toContain('application/problem+json')
    for (const member of ['type', 'title', 'status', 'detail', 'instance']) {
      expect(body).toMatch(new RegExp(`\\b${member}\\b`))
    }
  })

  it('the versioning section states the path version, the 90-day window and the deprecation headers', () => {
    const body = llm.developers['versioningBody'] ?? ''
    for (const term of ['v1', '90 days', 'Deprecation', 'Sunset', 'rel="successor-version"', 'portal contract']) {
      expect(body).toContain(term)
    }
  })

  it('the rate-limit section states the budget and the header fields', () => {
    const body = llm.developers['rateLimitBody'] ?? ''
    for (const term of ['60 requests per minute', 'RateLimit-Policy', 'RateLimit header', 'Retry-After', '429']) {
      expect(body).toContain(term)
    }
  })

  it('the OpenAPI Suppressed description is status-neutral and channel-neutral, in value and _meta', () => {
    // The website OpenAPI generator attaches it to the /api/v1 facade's 503, while the data host
    // still answers its own status: the text may name neither that status nor the host. Read from src/ for the _meta.
    const rich = readJson(join(PKG, 'src', 'llm.en-US.json')) as {developers: Record<string, unknown>}
    const text = JSON.stringify(rich.developers['apiSuppressedResponse'])
    expect(text).not.toMatch(/\b403\b|cloudfront|jonathanlloyd\.me/i)
    // The value names no status code at all; _meta.usage names the facade's 503 it documents.
    expect(llm.developers['apiSuppressedResponse']).not.toMatch(/\b\d{3}\b/)
    expect(llm.developers['apiSuppressedResponse']).toContain('Retry-After')
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

/**
 * A section that carries a display date (`lastUpdated`, "October 2026") and a machine date
 * (`lastModified`, "2026-10-14") states the same fact twice. The privacy page showed "June 2026"
 * for two months after commit 1a23ee2 (PR #148, 2026-07-30) changed its text, because nothing tied
 * the display string to the change. This holds every such pair to one month and year, and every
 * `lastModified` to a real calendar date the website's sitemap can emit.
 */
describe('@j0nathan-ll0yd/copy content dates', () => {
  const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/

  interface Section {
    path: string
    fields: Record<string, unknown>
  }

  /** Every object in a flat namespace that holds at least one direct string field. */
  function sections(node: unknown, path: string, out: Section[]): Section[] {
    if (node && typeof node === 'object' && !Array.isArray(node)) {
      const fields = node as Record<string, unknown>
      out.push({path, fields})
      for (const [key, value] of Object.entries(fields)) {
        sections(value, `${path}.${key}`, out)
      }
    }
    return out
  }

  const all = ['identity', 'llm'].flatMap((ns) => sections(readJson(join(PKG, 'dist', `${ns}.flat.json`)), ns, []))
  const dated = all.filter((s) => 'lastModified' in s.fields)

  /** UTC calendar date, or null when the string is not a real YYYY-MM-DD day. */
  function calendarDate(value: unknown): Date | null {
    const match = typeof value === 'string' ? ISO_DATE_RE.exec(value) : null
    if (!match) {
      return null
    }
    const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
    return date.toISOString().slice(0, 10) === value ? date : null
  }

  it('the four contract sections carry lastModified', () => {
    expect(dated.map((s) => s.path).sort()).toEqual(['identity.about', 'identity.contact', 'identity.privacy', 'llm.developers'])
  })

  it('every lastModified is a real ISO-8601 calendar date', () => {
    expect(dated.filter((s) => calendarDate(s.fields['lastModified']) === null).map((s) => `${s.path}.lastModified: ${String(s.fields['lastModified'])}`))
      .toEqual([])
  })

  it('wherever a section has both, lastUpdated is the en-US month and year of lastModified', () => {
    const pairs = dated.filter((s) => 'lastUpdated' in s.fields)
    // Non-vacuous: the privacy section is the pair this test exists for.
    expect(pairs.map((s) => s.path)).toContain('identity.privacy')
    const drift = pairs.flatMap((s) => {
      const date = calendarDate(s.fields['lastModified'])
      const expected = date?.toLocaleString('en-US', {month: 'long', year: 'numeric', timeZone: 'UTC'})
      return s.fields['lastUpdated'] === expected ? [] : [`${s.path}: lastUpdated ${JSON.stringify(s.fields['lastUpdated'])} != ${JSON.stringify(expected)}`]
    })
    expect(drift).toEqual([])
  })

  it('the privacy page reads October 2026 (owner decision 2026-10-14)', () => {
    const privacy = dated.find((s) => s.path === 'identity.privacy')
    expect(privacy?.fields['lastUpdated']).toBe('October 2026')
    expect(privacy?.fields['lastModified']).toBe('2026-10-14')
  })
})

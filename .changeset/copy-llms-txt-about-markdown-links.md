---
'@j0nathan-ll0yd/copy': patch
---

Author the llms.txt About-section links as markdown links, not bare URLs.

`llm.txt.linkSite`, `llm.txt.linkGithub`, and `llm.txt.linkLinkedin` emitted
`- Site: {siteUrl}` style list items. llms.txt requires link list items, so the
served artifact failed its own structural rule — a producer contract test in
mantle-LifegamesPortal caught it. The new form matches the conforming siblings
in the same namespace (`liveFullDump`, `endpointHealth`, and the rest):

- `- Site: {siteUrl}` -> `- [Site]({siteUrl})`
- `- GitHub: {profileGithub}` -> `- [GitHub]({profileGithub})`
- `- LinkedIn: {profileLinkedin}` -> `- [LinkedIn]({profileLinkedin})`

Blast radius: the only consumer of these three `txt`-namespace keys is
`src/lib/llm-content/templates/llms-txt.eta:9-11` in mantle-LifegamesPortal. A
sweep of design-system-Lifegames, j0nathan-ll0yd.github.io, ios-LifegamesPortal
and mantle found no other reader. The identically-named keys in the `full`
namespace feed `llms-full.eta` under a different heading and a different
structural rule set; they are unchanged.

Values only — no key, type, or export-surface change, so patch.

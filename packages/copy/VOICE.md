# Lifegames Voice & Style

The source of truth for how Lifegames sounds. One voice across every surface — the Human Datastream dashboard, the Life Portal app, the design system, the backend, and the theatre reviews — flexed by register, never fragmented into different personalities.

This file is the constitution. Read the first screen; the appendices are reference. The enforced surfaces (the `register` enum, the `check-copy-voice.mjs` lint, the review checklist) are the real interface — this document is the reasoning behind them. Governed by [`GOVERNANCE.md`](../../GOVERNANCE.md) P3.1 (copy is a single-source-of-truth content leaf).

---

## The constitution

### The spine

> **The voice of a human broadcasting himself in machine-readable form — on his own terms. Legible to the machine, never surrendered to it.**
>
> A wry engineer at a terminal: precise, dry, quietly confident. It shows the work and skips the hype. It renders a life as a datastream while insisting the human is the irreducible _source_ — not an obsolete algorithm.

Everything below is downstream of one stance: this is a person who chooses to publish himself as data, against a world that increasingly assumes the human is just data. "Human Datastream … as the world becomes more AI-centric" is the rebuttal, not the surrender.

**Precise · Wry · Defiantly human.**

### We are / we are not

| We are                               | We are not                                          |
| ------------------------------------ | --------------------------------------------------- |
| Precise — every word earns its place | Vague, padded, or hedged                            |
| Wry — wit through precision          | Zany, jokey, or breathlessly gung-ho                |
| Confident through restraint          | Boastful, hyped, or self-announcing                 |
| Legible to machines                  | Surrendered to them ("you are your HRV")            |
| Earnest about the data               | Ironic or detached                                  |
| Human-first                          | Soft, wellness-coachy, congratulatory               |
| A mirror that shows the data         | A coach that interprets your feelings               |
| Genre-literate at the right dose     | Cyberpunk cosplay (neon adjectives, chrome clichés) |

### The register dial

One voice; `register` is how loud the personality plays on a given surface:

| register     | one-line                                                                     |
| ------------ | ---------------------------------------------------------------------------- |
| `atom`       | Fixed atoms — UI verbs, acronyms, units, canonical IDs. No latitude.         |
| `label`      | Short labels with mild editorial room.                                       |
| `factual`    | Sentence-length facts, no personality.                                       |
| `expressive` | The personality register. Where the voice actually plays.                    |
| `machine`    | Structured text for LLM/JSON-LD ingestion. Factual-neutral, not brand voice. |
| `brand`      | Identity-asserting, personality-claim strings.                               |
| `consent`    | App Store permission strings. Regulatory, fixed template.                    |

### The arbitration rule

> **Literal-first in machine surfaces; allusive only in human-narrative ones.** Never sacrifice parseability for flavor in any string whose `usage[]` touches a machine surface (`llms-txt`, `llms-full`, `JSON-LD`, `.txt`, `feed`, `<SYSTEM>`). The machine gets facts; the human gets the voice.

### The seven principles

1. **One voice, many registers.** The dial, not different voices.
2. **Legible to machines, irreducibly human.** The spine, shipped as the arbitration rule.
3. **Wit through precision, not volume.** Dry, not manic. One earned dry beat beats three jokes. Never explain the joke.
4. **Show the work, skip the hype.** The data is the flex. No marketing fluff, no AI-slop, no fake urgency.
5. **Data is a mirror, not a coach.** Report the fact; let the reassurance be implied. Be honest about what a number can claim.
6. **Earn the aesthetic through ethos; dose the flavor.** The cyberpunk is earned by being genuinely independent and hand-built — not by neon. One leet wink (the handle).
7. **Each string does one thing.** Strip to the signal.

---

## Appendix A — Registers in full

| register     | definition                                     | when to use                                                            | latitude        | examples                                             |
| ------------ | ---------------------------------------------- | ---------------------------------------------------------------------- | --------------- | ---------------------------------------------------- |
| `atom`       | Non-negotiable fixed atoms                     | UI verbs, acronyms, units, canonical identifiers, nav labels           | 0               | `Save`, `BPM`, `km`, `REM`, `Settings`               |
| `label`      | Short non-narrative strings with mild room     | badges, status values, section headings, short empty-states            | 1               | `live`, `Recovery Day`, `Sync Status`                |
| `factual`    | Sentence-length facts, no personality          | neutral readouts, descriptive bios, validation errors                  | 1–3             | `date must be YYYY-MM-DD`, neutral bio prose         |
| `expressive` | The personality register — deliberate voice    | flavor copy, taglines-in-prose, empty-states with character, marketing | 2–3             | `100% pure, old fashioned, home-grown human…`        |
| `machine`    | Structured text authored for machine ingestion | `llms.txt` / `llms-full.txt` templates, JSON-LD prose                  | 3               | `## About`, table headers, framing sentences         |
| `brand`      | Identity-asserting, personality-claim strings  | site name, taglines, OG quote                                          | 2–3             | `Human Datastream`, `Jack into his human datastream` |
| `consent`    | App Store consent strings                      | HealthKit / location / motion permission requests                      | 3 (low freedom) | `Life Portal reads heart rate …`                     |

**Migration from the legacy 12 tones** (applied during the Phase-5 re-tone):

| legacy tone                                                   | → register       |
| ------------------------------------------------------------- | ---------------- |
| `terse` (fixed), `functional` (verbs/units)                   | `atom`           |
| `terse` (soft), `functional` (short labels)                   | `label`          |
| `neutral`, `professional`                                     | `factual`        |
| `marketing`, `encouraging`, `playful`, `reflective`, `casual` | `expressive`     |
| `llm-prose`                                                   | `machine`        |
| `brand` (one-word names)                                      | `atom` / `label` |
| `brand` (identity phrases)                                    | `brand`          |
| `professional` (permissions only)                             | `consent`        |

## Appendix B — Audience & the arbitration rule

The second axis. `audience` rides in `_meta` alongside `register`:

| audience  | meaning                                                   | voice                                                                   |
| --------- | --------------------------------------------------------- | ----------------------------------------------------------------------- |
| `human`   | rendered for a human (UI or SEO/preview)                  | full brand voice permitted                                              |
| `machine` | LLM / JSON-LD / feed / robots                             | factual-neutral; prefer statistics + passage-level clarity; no allusion |
| `dual`    | human-readable **and** machine-parsed (e.g. JSON-LD bios) | voice allowed, but stay clean enough that an LLM resolves the entity    |

**Why machines get facts, not flavor:** the GEO research (Princeton, KDD 2024) found statistics raise AI citation ~40% while keyword density does nothing; promotional tone in JSON-LD/`llms.txt` degrades entity resolution. (Note: Google does not consume `llms.txt` today — Claude Code, Cursor, and Perplexity do — so the `machine` register earns its keep on non-Google AI surfaces.)

**Machine-surface predicate (lint-checkable):** a `usage[]` entry matching `llms-txt`, `llms-full`, `JSON-LD`, `.txt`, `feed`, or `<SYSTEM>`. `check-copy-voice.mjs` reads the rich `src/` files (the flat `dist/` strips `_meta`/`usage`) and fails CI on allusion in a machine surface.

## Appendix C — Mechanics

**Case.** Sentence case on web (one rule, no per-word debates, localization-friendly). iOS follows Apple HIG title case via display transform — strings are stored natural-case (D3). Acronyms are always uppercase and exempt: `BPM`, `HRV`, `RHR`, `RR`, `REM`, `ECG`, `API`, `URL`, `GPS`. Don't invent acronyms.

**Punctuation.**

- No terminal period on labels, buttons, headings, or badges. Full sentences get periods.
- Em dash is `—` (U+2014), never `--`. Ellipsis is `…` (U+2026), never `...`. Ranges use an en dash: `0–100`.
- Oxford comma, always.
- Smart quotes in prose; straight quotes only inside code or literal technical strings.
- One exclamation mark per screen, maximum. Prefer zero. (`Success! Connected.` is the kind of place one is earned.)

**Numbers, dates, units.** Numerals for data (`62 bpm`, `24+ years`). Unit spacing follows the established convention per unit. ISO `YYYY-MM-DD` in metadata and errors; human-readable dates in UI. Percentages as `{n}%`.

**ICU MessageFormat 1.** camelCase placeholder names. Any plural that can render zero needs an explicit `=0` clause — never let `other` produce "0 books". Always include `other`. Nest `select` outer, `plural` inner.

**Emoji.** None in UI copy. Terminal-minimal has no emoji; warmth comes from precision, not decoration.

**Banned terms** (lint-enforced where mechanical):

- Hype/AI-slop: `revolutionize`, `unleash`, `seamless`, `cutting-edge`, `passionate about`, `in today's fast-paced world`, the "it's not just X, it's Y" construction.
- Filler apology/politeness as openers: `please` (as a sentence opener), `we're sorry` (routine), `sorry`.
- Vague/UX-hostile: `click here`, `invalid`, `crazy`.
- Non-inclusive: `whitelist`/`blacklist` (use `allowlist`/`blocklist`), `kill`/`execute` in user-visible strings.
- Terminology consistency: `log in` (not `sign in`); `finished` for a completed book (not `complete`/`done`).

## Appendix D — Do / Don't gallery

| context         | Don't                                                     | Do                                                                                    |
| --------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Empty state     | `No movement yet today 💪`                                | `No movement logged yet.`                                                             |
| Error           | `We're sorry, your session expired. Please log in again.` | `Session expired. Log in to continue.`                                                |
| Biometric       | `Your HRV looks great today!`                             | `HRV 62 ms — above 7-day baseline`                                                    |
| Recovery        | `Your body recovers while you rest`                       | `Rest day. Recovery in progress.`                                                     |
| Machine surface | `Jack into the dazzling neon datastream…` (in `llms.txt`) | `Backend engineer. 24+ years. Live health, GitHub, reading, theatre data.`            |
| Bio (human)     | `Passionate, results-driven engineering leader…`          | `100% pure, old fashioned, home-grown human, born free right here in the real world.` |
| CTA             | `Click here to learn more!`                               | `Read the spec`                                                                       |

## Appendix E — Voicing biometrics (the health rule)

Data is a mirror, not a coach. This is why "quantified-self clarity" was deliberately left out of the kinship.

- **Raw biometric display = clinical-exact.** State the number or the zone as fact. HR-zone labels (`Bradycardia`, `Resting Zone`, `Fat Burn`, `Peak Zone`) are fixed `atom`/`label` — no softening, no warmth. Precision is the dignity.
- **Milestone / empty surfaces = dry, not warm.** Encouragement is implied by the data, never announced. "Rest day. Recovery in progress." not "Your body is asking for rest today."
- **The honesty test (Altini):** if an honest scientist would push back on a claim as over-interpreted, don't make it. Report what the sensor measured; state one implication at most; stop. No exclamation marks, no coaching.

## Appendix F — Authoring workflow & enforcement

Every customer-facing string:

1. **Picks a `register`** (the 7-value enum, enforced by Ajv at build — an unknown register fails `pnpm -F @j0nathan-ll0yd/copy build`).
2. **Carries an `audience`** (`human` / `machine` / `dual`).
3. **Obeys the arbitration rule** if `audience` is `machine`/`dual` (lint-enforced).
4. **Passes the mechanics lint** (`check-copy-voice.mjs`: banned terms, case, punctuation, ICU).
5. **Respects `constraints.maxChars`** and ICU MF1 parsing (build tests).
6. **Clears the voice-review checklist** ([`VOICE-REVIEW-CHECKLIST.md`](./VOICE-REVIEW-CHECKLIST.md)) for the judgment calls a linter can't make.

Reword of existing copy happens in supervised domain waves (identity → llm → widgets → app/others), each diff approved before commit. `_meta.lastReviewed` bumps only when `value` changes.

---

_Source: `.omc/research/phase2-voice-synthesis.md` (≈56 web searches + full 552-string corpus audit). This file is the human-readable constitution; `voice.summary.json` is the machine-readable summary consumed by `DESIGN.md` and the docs site._

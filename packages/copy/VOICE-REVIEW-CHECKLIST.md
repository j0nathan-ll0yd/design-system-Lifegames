# Voice Review Checklist

The judgment pass a linter can't do. Run this against any new or reworded customer-facing string before it ships. Mechanical rules (banned terms, punctuation, ICU, maxChars, register enum) are enforced by `check-copy-voice.mjs` + the build; this checklist covers the human calls. See [`VOICE.md`](./VOICE.md) for the full reasoning.

## Per-string

- [ ] **Register is right.** Is the chosen `register` the lightest one that does the job? (Don't tag a button `expressive`.)
- [ ] **Audience is right.** `human` / `machine` / `dual` — and if `machine`/`dual`, does it obey the arbitration rule (literal, parseable, no allusion)?
- [ ] **Wit through precision.** If there's humor, is it dry and earned — or is it trying to be funny? Cut anything zany. Never explain the joke.
- [ ] **No hype, no slop.** No marketing fluff, no AI-slop constructions ("it's not just X, it's Y"), no fake urgency.
- [ ] **Mirror, not coach.** For any health/biometric string: does it report the fact and let reassurance be implied — or does it cheerlead? Could an honest scientist push back on the claim?
- [ ] **One thing.** Is the string doing exactly one communicative job?
- [ ] **Dose the flavor.** Genre/terminal/leet texture only where it's earned (a real terminal widget, a human-narrative surface) — never as costume.

## Per-change

- [ ] **maxChars respected** (the build will fail otherwise — check before you commit).
- [ ] **ICU placeholders + literal markdown preserved** byte-for-byte.
- [ ] **`lastReviewed` bumped** only because `value` actually changed.
- [ ] **`_meta.rationale`** explains why a reworded value differs (append to any existing FLAGGED note; don't overwrite it).
- [ ] **Cross-surface check.** This string may render on web, iOS, and the backend — does the new wording work everywhere it appears in `usage[]`?

## Wave sign-off (reword)

- [ ] Diff reviewed by the BDFL before commit.
- [ ] `pnpm -F @lifegames/copy build` green (codegen byte-deterministic).
- [ ] `pnpm test` + `check-freshness.sh` green.

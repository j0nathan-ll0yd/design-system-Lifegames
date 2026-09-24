---
'@j0nathan-ll0yd/fixtures': patch
---

focus fixtures: stamp `hidingSince` on every hiding-mode variation (portal-contract 2.7.0).

`raw-schemas/focus-export.schema.json` in portal-contract 2.7.0 carries an `if`/`then` that requires
`hidingSince` whenever `currentFocus` names a hiding mode — `HIDING_FOCUS_MODES`, which is `Work` or
`Do Not Disturb`. The schema digest moved `1115d4aa…` → `5294bdc9…`.

`@j0nathan-ll0yd/fixtures@1.3.4` shipped two hiding-mode fixtures without the key:

    src/generated/focus/baseline.json  { "generatedAt": "…", "currentFocus": "Work" }
    src/generated/focus/dnd.json       { "generatedAt": "…", "currentFocus": "Do Not Disturb" }

Both are schema-invalid under 2.7.0. The consequence is not cosmetic: in `j0nathan-ll0yd.github.io`
the focus decode fails, `api.ts:194`'s `hiding = focus.status === 'ok' && …` goes false, and the
privacy overlay never renders. Its visual suite failed 10 checks — both privacy overlays across five
viewports — on `#focusOverlay` and `#dndOverlay` being hidden. A privacy control defeated silently by
a stale fixture.

`baseline` now carries `hidingSince` one day before `generatedAt` and `dnd` three days before;
`full` keeps its existing two days, so the three hiding fixtures stay distinguishable on disk. The
non-hiding variations (`''`, `Personal`) do not carry the key, because the producer only stamps it on
entering a hiding mode.

`createFocusFixture` also supplies `hidingSince` for hiding modes when a caller omits it, tested
against the contract's own `HIDING_FOCUS_MODES` rather than a local string list. The factory default
was `currentFocus: 'Work'` with no timestamp, so `createFocusFixture()` with no arguments returned an
off-contract payload — the same defect at its source. An explicit override still wins, and a
non-hiding focus is left alone.

No producer defect underlies this. `mantle-LifegamesPortal/src/lambdas/api/focus.post.ts:97-103`
already always sets `hidingSince` when entering a hiding mode; 2.7.0 formalised behaviour production
already had, and only the fixtures were stale.

New `tests/focus-contract.test.ts` compiles `focus-export.schema.json` from the resolved
portal-contract package and holds every committed focus fixture to it. The load-bearing half is the
reject side: it asserts a hiding-mode payload without `hidingSince` is REFUSED, which fails both if
the schema is ever loosened and if the portal-contract dependency regresses below 2.7.0 — behaviour
the `^2.5.0` manifest range cannot express on its own. It also pins that `hidingSince` sits on exactly
the hiding-mode fixtures and never on the others, so the fix cannot be over-applied.

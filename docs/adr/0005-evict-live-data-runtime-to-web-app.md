# 0005 — Evict the live-data data layer to the web app

## Context

`@lifegames/web` shipped the web dashboard's client-side **data layer** under
`packages/web/src/runtime/`: `live-data.ts` (orchestrator), `ws-client.ts`
(WebSocket), `poll-engine.ts` (polling), and `api.ts` (fetch). A graceful-deploy
feature exposed the latent boundary violation: `live-data.ts` called the web app's
`window.__checkForSwUpdate` global, so the **design system knew about service workers
and deploy lifecycle**. This breaks P3 (Presentational-purity boundary: "no data
fetching … data in, events out") and the container/presentational + dependency-inversion
consensus that data fetching, transport, and service-worker update detection belong in
the **app shell**, not a shared library. Viable alternatives considered: (a) invert only
the SW seam in place (a CustomEvent) — fixes the symptom but leaves a fetch/WS/poll
runtime inside a "presentational" system; (b) keep transport in the DS as
"infrastructure" — rejected because `ws-client`/`poll-engine` are app-domain-aware
(they hard-code the resource taxonomy, the `/api/live` base, the `?_poll=1` Workbox
bypass, and cast WS payloads to `ResourceKey`), so they are not generic transport.

## Decision

Move the four impure files (`live-data`, `ws-client`, `poll-engine`, `api`) and their
unit tests to the consumer web app (`j0nathan-ll0yd.github.io/src/lib/runtime/`). The
DS retains the **presentational hydration** layer it legitimately owns: the `updaters*`
DOM patchers, `adapters` (pure transforms), the per-widget `*-init` island entrypoints,
`particles`, and the shared helpers/constants/types — all consumed by DS islands,
production widgets, `@lifegames/fixtures`, and the showcase apps. The app's relocated
`live-data` imports those presentational primitives via `@lifegames/web/runtime/*` and
drives them ("data in, events out"); the app-update→SW nudge becomes an app-internal
call. The shared contract types are **not** design-system concerns: `ResourceKey`
(= `keyof typeof ENDPOINTS`) lives in `@lifegames/portal-contract` alongside `ENDPOINTS`,
and `PollStatus` lives with the web app's poll engine that produces it. The
connection-status updater (`updaters-status`) that renders `PollStatus` moved to the web
app too — it reflects runtime connection health (an app-shell concern), not domain
presentation. The DS adds a `./types/*` export so the moved files can keep importing the
generated backend export types from their single source.

## Consequence

`@lifegames/web` now conforms to P3 for the first time: a grep for
`__checkForSwUpdate`/`serviceWorker` in `packages/web/src` returns nothing, and the DS
does no data fetching. This partially reverses the "hollow web app" posture — the web app
now owns its data/transport/orchestration — but does **not** un-hollow widgets, which
remain DS-owned. Future data-runtime changes (polling cadence, WS protocol, deploy
nudges) are made in the consumer, not the design system. Consumers other than the web app
that want live hydration must supply their own data layer against the DS's presentational
updaters. The cross-repo split is coordinated by yalc + a DS-first merge order.

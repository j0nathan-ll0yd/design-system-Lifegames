# Widget-rule known answers

One file of known answers per widget state rule that has a Swift twin (atlas decision 0160).

| File                                  | Web rule                                                       | Swift twin                                                                           |
| ------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `heart-rate-state.known-answers.json` | `heartRateState` in `packages/web/src/runtime/widget-rules.ts` | `WidgetRules.heartRateState` in `Sources/LifegamesWidgets/Runtime/WidgetRules.swift` |

Both sides read the same file:

- `heart-rate-state.test.ts` runs the web rule over it. Run it with
  `pnpm --filter ./packages/web exec vitest run --config ../../contracts/widget-rules/vitest.config.mjs`.
  It runs in the required `governance-gates` status context and in `.husky/pre-push`.
- `Tests/LifegamesWidgetsTests/WidgetRulesTests.swift` runs the Swift twin over it in `swift test`.

Change a rule, its twin and the file in one pull request. An expected state comes from running the web
rule, never from reading it.

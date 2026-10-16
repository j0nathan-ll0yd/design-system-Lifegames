# Deprecation Policy

**Repo:** `design-system-Lifegames` | **Applies to:** tokens, components, widgets (all platforms)

---

## Scope

This policy governs the formal deprecation of:

- **Design tokens** — entries in `tokens/*.tokens.json` (W3C DTCG format)
- **Web components** — Astro components under `packages/web/` and `apps/`
- **Swift components and widgets** — sources under `Sources/LifegamesComponents/`, `Sources/LifegamesWidgets/`, and `Sources/LifegamesComponentsWatch/`
- **Copy keys** — leaves of the copy package (`packages/copy/schema/*.schema.json`, `packages/copy/src/*.en-US.json`)

Deprecation is a lifecycle state (see GOVERNANCE.md §3 P7). A `Deprecated` item is still published but scheduled for removal. Consumers must migrate before the next MAJOR release.

---

## Annotation

### Tokens (W3C DTCG)

Add the `$deprecated` field and a `$extensions.lifegames.replacedBy` pointer on the token entry in `tokens/*.tokens.json`:

```json
{
  "color.accent.magenta": {
    "$value": "{color.neon.pink}",
    "$type": "color",
    "$deprecated": true,
    "$extensions": {
      "lifegames": {
        "replacedBy": "color.accent.pink"
      }
    }
  }
}
```

If there is no direct replacement, set `replacedBy` to `null` and add a `$description` explaining the removal rationale.

### Web Components (Astro / CSS)

Add a JSDoc `@deprecated` comment at the top of the component file and reference the replacement:

```astro
---
/**
 * @deprecated Use <NewComponent> instead. Removed in next MAJOR release.
 */
---
```

Update the component's registry entry in `production-widgets.json` to `"status": "Deprecated"`.

### Swift Components and Widgets

Use the `@available` deprecation attribute on the type declaration:

```swift
@available(*, deprecated, message: "Use NewWidget instead. Removed in next MAJOR release.")
public struct OldWidget: View { ... }
```

For token constants in `LifegamesTokens`, apply `@available` on the static property:

```swift
@available(*, deprecated, renamed: "LifegamesTokens.Color.accentPink")
public static let accentMagenta = accentPink
```

Update the registry entry `"status": "Deprecated"` in `production-widgets.json` to keep the lifecycle label in sync.

---

### Copy Keys (`packages/copy`)

Mark the leaf's `$ref` node in the rich schema (`packages/copy/schema/<namespace>.schema.json`) with `deprecated: true` and a `description` that names the replacement:

```json
"backLink": {
  "$ref": "#/$defs/CopyString",
  "deprecated": true,
  "description": "Deprecated: use `identity.navigation.backLink` instead. Removed in the next major release."
}
```

The description starts with `Deprecated: use `<namespace>.<path>` instead.` or `Deprecated: no replacement.`. The copy build carries both annotations into every generated artifact: the flat schema gets the `deprecated` keyword, the TS type an `@deprecated` JSDoc, the Zod schema a `.describe()`, and the Swift property a `///` doc comment. In the authoring file (`src/<namespace>.en-US.json`), keep the value and record the deprecation in `_meta.description` and `_meta.rationale`.

Swift gets a doc comment, not `@available(*, deprecated)`. The generated memberwise `init` and `with(...)` read every property, so the attribute raises two compiler warnings inside `LifegamesCopy` for each deprecated key. A Swift consumer that reads a deprecated copy key therefore sees no compiler warning.

The build exits 1 (`packages/copy/scripts/deprecation.ts`) when a deprecation:

- does not start its description with one of the two forms above;
- names a replacement that is not a leaf of the same namespace, or is itself deprecated;
- marks a group, not a leaf;
- marks an object-valued leaf (`CopyLink`). Its flat form is a `$ref`, whose sibling annotations Zod and Swift codegen drop;
- sets `deprecated` to anything but the boolean `true`.

## Survival Period

A deprecated item must survive for **at least one MAJOR release** before removal.

| Phase                    | Action                                                                                                                 |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| **Deprecate in vX.Y.Z**  | Annotate as described above; add to `packages/tokens/dist/deprecated-tokens.json`; record in quarterly audit.          |
| **Remove in v(X+1).0.0** | Delete source, remove registry entry, remove from `deprecated-tokens.json`. Include a migration note in the CHANGELOG. |

Exceptions (removal in a MINOR release) require an explicit ADR in `docs/adr/` justifying the accelerated timeline (e.g., security issue, license conflict).

---

## Migration Alias

Every deprecated item must name its replacement or state there is none:

- **Token:** `$extensions.lifegames.replacedBy` — canonical token name string, or `null`.
- **Web component:** `@deprecated` JSDoc comment with component name or "no replacement".
- **Swift:** `@available(*, deprecated, renamed: "...")` or `message:` with "no replacement".
- **Copy key:** the schema `description` names it as "use `<namespace>.<path>` instead", or states "no replacement".

A deprecated token with no `replacedBy` value and no `$description` is a policy violation. The `eslint-local-rules/no-deprecated-tokens.js` rule treats such tokens as errors.

---

## Tooling

### Flagging Consumers

`eslint-local-rules/no-deprecated-tokens.js` scans web source files for references to tokens listed in `packages/tokens/dist/deprecated-tokens.json`. Any direct use of a deprecated token name is a lint error. Run via `pnpm lint`.

### Deprecated Token Manifest

`packages/tokens/dist/deprecated-tokens.json` is generated by Style Dictionary during `pnpm build:tokens`. It lists every token whose DTCG entry carries `"$deprecated": true`, along with its `replacedBy` value (if any) and the release in which it was deprecated.

Example shape:

```json
[
  {
    "name": "color.accent.magenta",
    "replacedBy": "color.accent.pink",
    "deprecatedIn": "1.4.0"
  }
]
```

Consumers (web and iOS) can read this file to surface deprecation warnings at build time.

---

## Quarterly Audit

Deprecated items are tracked in `docs/quarterly-checks.md`. Each quarter, the BDFL reviews the list and decides:

1. **Remove** — survival period has elapsed and migration is complete. Schedule removal in the next MAJOR release.
2. **Extend** — consumers still blocked; document the reason and set a new target release.
3. **Reinstate** — deprecation was premature; revert annotation and update registry.

The audit entry format in `docs/quarterly-checks.md`:

```markdown
### Q2 2026

| Item                   | Type         | Deprecated In | Target Removal | replacedBy          | Decision                      |
| ---------------------- | ------------ | ------------- | -------------- | ------------------- | ----------------------------- |
| `color.accent.magenta` | token        | 1.4.0         | 2.0.0          | `color.accent.pink` | remove                        |
| `OldWidget`            | Swift widget | 1.3.0         | 2.0.0          | `NewWidget`         | extend (iOS consumer blocked) |
```

---

## Related Documents

- `GOVERNANCE.md` §3 P7 — Lifecycle labels (`Experimental` → `Beta` → `Stable` → `Deprecated`)
- `GOVERNANCE.md` §6 — Versioning and release (semver contract for MAJOR removals)
- `docs/adr/` — ADR required for any accelerated removal (MINOR-release exception)
- `docs/quarterly-checks.md` — Audit log for active deprecations

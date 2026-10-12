---
'@j0nathan-ll0yd/schemas': patch
---

`scripts/validate.ts` registers and looks up every schema under a valid URN. It built the Ajv key as `urn:<namespace>:<title>`, and the title `PinnedRepos Widget` holds a space, which a URN cannot. fast-uri (Ajv's URI resolver) up to 3.1.5 cut the key at the space. From 3.1.6 it throws `URN without nid cannot be serialized`, so every consumer prebuild that runs `validate.ts` failed once its lockfile took a patched fast-uri.

- New `scripts/schema-urn.mjs` exports `schemaUrn(namespace, name)`, which percent-encodes the name. It ships in the package `files` list.
- `validate.ts` builds its four `addSchema` keys and three `getSchema` lookups through it. Consumers invoke `validate.ts` the same way as before.

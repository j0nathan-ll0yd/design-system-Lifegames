# @j0nathan-ll0yd/config

Single source of truth for the Lifegames estate's TypeScript **formatting** (dprint),
**type-safety floor** (tsconfig), and **ESLint** flat-config standard. Every TypeScript
repo in the estate — including the mantle framework — extends this package.

Three artifacts, three consumer touch-points:

| Artifact             | Import path                                 | Owns                                |
| -------------------- | ------------------------------------------- | ----------------------------------- |
| `dprint.json`        | `@j0nathan-ll0yd/config/dprint.json`        | All formatting (whitespace, quotes) |
| `tsconfig-base.json` | `@j0nathan-ll0yd/config/tsconfig-base.json` | Type-safety compiler floor          |
| `eslint.js`          | `@j0nathan-ll0yd/config/eslint`             | Lint rules (formatting rules OFF)   |

Distributed via **GitHub Packages** (`https://npm.pkg.github.com`).

## Consumer install

`@j0nathan-ll0yd/*` packages live on GitHub Packages, so every consumer repo needs an
`.npmrc` that routes the `@j0nathan-ll0yd` scope to the GitHub registry and supplies a token:

```ini
# .npmrc (in the consumer repo root)
@j0nathan-ll0yd:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

`GITHUB_TOKEN` needs `read:packages`. In CI, the built-in Actions token works if the
job grants `permissions: { packages: read }`. Then:

```bash
npm install --save-dev @j0nathan-ll0yd/config
# or: pnpm add -D @j0nathan-ll0yd/config
```

## 1. dprint

dprint's `extends` supports a file-path base, so point it at the installed copy under
`node_modules`. **The base carries no `includes`/`excludes`** — each repo sets its own:

```json
// dprint.json (in the consumer repo root)
{
  "extends": "./node_modules/@j0nathan-ll0yd/config/dprint.json",
  "includes": ["**/*.{ts,tsx,js,mjs,cjs,json}"],
  "excludes": ["**/node_modules", "**/dist", "**/*.gen.ts"]
}
```

Verified with dprint `^0.55` (file-path `extends` from a `node_modules` path is
supported). The base pins the plugin versions
(`typescript-0.93.4`, `json-0.19.4`), so consumers inherit them and need not re-declare
`plugins`.

## 2. tsconfig

TypeScript resolves `extends` against a bare package specifier via Node module
resolution. The base deliberately omits `target` / `module` / `moduleResolution` / `lib`
because environments differ (Node/NodeNext vs Astro/bundler) — the consumer sets those:

```json
// tsconfig.json (in the consumer repo)
{
  "extends": "@j0nathan-ll0yd/config/tsconfig-base.json",
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*.ts"]
}
```

The base sets: `strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`,
`noFallthroughCasesInSwitch`, `noImplicitReturns`, `forceConsistentCasingInFileNames`,
`skipLibCheck`, `resolveJsonModule`, `moduleDetection: "force"`. It intentionally does
**not** set `exactOptionalPropertyTypes`.

## 3. ESLint

`eslint.js` exports a flat-config **factory**, `createBaseConfig(...)`. Formatting rules
are OFF — dprint owns formatting; the two never fight.

```js
// eslint.config.js (in the consumer repo)
import { createBaseConfig } from '@j0nathan-ll0yd/config/eslint';

export default [
  ...createBaseConfig({ tsconfigRootDir: import.meta.dirname }),
  {
    // repo-specific overrides go here
    ignores: ['dist/**'],
  },
];
```

- Core: `eslint:recommended` + `@typescript-eslint` **recommended (non-type-checked)** —
  safe for repos with no project graph.
- **Opt-in type-aware block:** pass `tsconfigRootDir` to enable
  `parserOptions.projectService` and turn on `@typescript-eslint/no-floating-promises`
  and `@typescript-eslint/no-misused-promises` (both `error`). Omit `tsconfigRootDir`
  for a fast, type-info-free lint:

  ```js
  export default [...createBaseConfig()]; // no type-aware rules
  ```

- **Estate-neutral by design:** no mantle-domain plugins/rules (no `eslint-plugin-drizzle`,
  no powertools/migrations/env local rules). Safe for a portfolio site, a governance repo,
  or an orchestration scaffold.

## Publishing (maintainers)

Published only via CI — `.github/workflows/publish-config.yml` (`workflow_dispatch`, or a
`config-v*` tag) — using the Actions `GITHUB_TOKEN`. No local tokens. Bump `version` in
`package.json` before dispatching.

# Fixture Scrubbing Audit Log

All fixture JSON files contain synthetic data only. No production or personal data has been copied.

**Enforcement:** The pre-commit hook (`scripts/scan-personal-data.sh`) scans staged JSON files **within this directory** (`Sources/LifegamesWidgets/Resources/widgets/`) for known personal data markers and blocks commits if any are found. The hook is intentionally scoped to the widget fixture pool — it does NOT scan `apps/site/`, which is the user's actual portfolio and is expected to contain real identity.

## Scrubbing Records

| Fixture file                                                                                    | Field         | Original (redacted)           | Replacement                                                                                             | Reason                                                                              |
| ----------------------------------------------------------------------------------------------- | ------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| identity/identity-card.json                                                                     | name          | J\*\*\*\*\*\*\* L\*\*\*d      | Sample User                                                                                             | Real name                                                                           |
| identity/identity-card.json                                                                     | github        | github.com/j0n\*\*\*\*\*\*    | github.com/devuser-01                                                                                   | GitHub identity                                                                     |
| identity/identity-card.json                                                                     | linkedin      | linkedin.com/in/j\*\*\*\*\*\* | linkedin.com/in/devuser-01                                                                              | LinkedIn identity                                                                   |
| identity/bio-terminal.json                                                                      | terminalLines | Real bio content              | Synthetic bio content                                                                                   | Personal information                                                                |
| reading/bookshelf.json                                                                          | asin          | B08N5\*\*\*\*\*               | B0EXAMPLE01-05                                                                                          | Amazon product IDs                                                                  |
| reading/bookshelf.json                                                                          | link          | Real affiliate link           | Omitted                                                                                                 | Amazon affiliate tag                                                                |
| other/og-image.json                                                                             | name          | J\*\*\*\*\*\*\* L\*\*\*d      | Sample User                                                                                             | Real name                                                                           |
| other/og-image.json                                                                             | avatarUrl     | Real avatar URL               | placeholders.dev                                                                                        | Real photo                                                                          |
| other/system-status.json                                                                        | all values    | Real status data              | Synthetic values                                                                                        | Live system data                                                                    |
| reading/theatre-reviews.json                                                                    | all entries   | Real review data              | Synthetic entries                                                                                       | Real review content                                                                 |
| health/\*.json                                                                                  | all values    | Real health data              | Synthetic values                                                                                        | Personal health data                                                                |
| media/\*.json                                                                                   | all values    | n/a (authored synthetic)      | Synthetic media titles, channels, and account ("Sample User" / <sample.user@example.com>)               | OMD app-preview fixture pool; no production or personal data used as source         |
| other/sync-status.{fresh,aging,stale,never-synced}.json                                         | all values    | n/a (authored synthetic)      | Synthetic timestamps derived from the existing sync-status.json reference date                          | Freshness variants for LP watch-widget previews                                     |
| location/visit-timeline.\_.json, location/saved-places.json, location/place-search-results.json | all values    | n/a (authored synthetic)      | Synthetic SF-downtown places, coordinates, and timestamps (ported from LP's former in-repo PreviewData) | LP location app-preview fixture pool; no production or personal data used as source |

## Image Assets (Phase C -- Production Mirror)

Ported image assets are PUBLIC personal content from the live portfolio:

- Book covers: Amazon product images identified by ISBN or ASIN (public retail identifiers)
- Theatre posters: Promotional programme images for public plays
- Avatar: Public profile image from jonathanlloyd.me

These are NOT sensitive PII. ISBNs and ASINs are public catalog numbers.
Theatre slugs are public play names. No personal data in filenames.

### Decisions

- **ASINs/ISBNs in fixtures:** Real identifiers used (not scrubbed). Rationale: ISBNs (e.g., `0525573844`) and ASINs (e.g., `B07QVH2Q2K`) are public retail catalog numbers assigned by publishers/Amazon. They identify books, not people. Using real identifiers ensures image path resolution works correctly with the copied book cover files.

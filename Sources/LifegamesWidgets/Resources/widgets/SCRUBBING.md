# Fixture Scrubbing Audit Log

All fixture JSON files contain synthetic data only. No production or personal data has been copied.

**Enforcement:** The pre-commit hook (`scripts/scan-personal-data.sh`) scans staged JSON files for known personal data markers and blocks commits if any are found.

## Scrubbing Records

| Fixture file | Field | Original (redacted) | Replacement | Reason |
|---|---|---|---|---|
| identity/identity-card.json | name | J\*\*\*\*\*\*\* L\*\*\*d | Sample User | Real name |
| identity/identity-card.json | github | github.com/j0n\*\*\*\*\*\* | github.com/devuser-01 | GitHub identity |
| identity/identity-card.json | linkedin | linkedin.com/in/j\*\*\*\*\*\* | linkedin.com/in/devuser-01 | LinkedIn identity |
| identity/bio-terminal.json | terminalLines | Real bio content | Synthetic bio content | Personal information |
| reading/bookshelf.json | asin | B08N5\*\*\*\*\* | B0EXAMPLE01-05 | Amazon product IDs |
| reading/bookshelf.json | link | Real affiliate link | Omitted | Amazon affiliate tag |
| other/og-image.json | name | J\*\*\*\*\*\*\* L\*\*\*d | Sample User | Real name |
| other/og-image.json | avatarUrl | Real avatar URL | placeholders.dev | Real photo |
| other/system-status.json | all values | Real status data | Synthetic values | Live system data |
| reading/theatre-reviews.json | all entries | Real review data | Synthetic entries | Real review content |
| health/*.json | all values | Real health data | Synthetic values | Personal health data |

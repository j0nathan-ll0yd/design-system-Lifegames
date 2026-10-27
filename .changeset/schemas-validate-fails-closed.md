---
'@j0nathan-ll0yd/schemas': major
---

`scripts/validate.ts` now fails closed, and `fixture-map.json` drops its `consumer` bucket.

- A mapped fixture that does not exist is an error. The message names the path, the bucket and the directory it resolved against. Before, the script skipped a missing file and still printed `OK: 0 fixture(s) validated successfully.`
- A run that validates 0 fixtures fails. So does a bucket that maps no fixtures, a `--bucket=<name>` that names no bucket, more than one `--bucket=` flag, and a map entry with no `schema`.
- A real validation error still exits 1, as before.
- The `consumer` bucket is gone. It mapped seven website files (`data/books.json`, `data/github.json`, `data/health.json`, `data/profile.json`, `data/reading.json`, `data/system.json`, `data/theatre-reviews-sample.json`). The website stopped writing them (atlas decision 0160), so the website prebuild validated nothing.
- New flag: `--map=<path>` reads another map.

Migration: stop running `scripts/validate.ts` from a consumer build. The shipped map now holds only the `ds` bucket, whose paths exist in the design-system repo alone. A consumer that still runs the script gets exit 1 and one `Mapped fixture not found` line per `ds` path. Major because an invocation that exited 0 now exits 1.

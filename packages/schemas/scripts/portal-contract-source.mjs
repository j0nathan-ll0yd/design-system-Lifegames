// Shared resolver for the raw export JSON schemas.
//
// @lifegames/portal-contract is the single producer of the 10 raw export
// *.schema.json files (published under its raw-schemas/ subpath). These scripts
// read the schemas from the resolved package on disk instead of a hand-synced
// local vendored/ copy. The canonical `https://lifegames.dev/vendored/<file>`
// URI namespace and the generated/ `$ref`s are unchanged — only the file SOURCE
// moved here.
//
// Authored as .mjs (not .ts) so the plain-node baseline-validate.mjs script can
// import it directly; tsx-run .ts scripts import it transparently.

import { createRequire } from 'node:module';
import { dirname } from 'node:path';

const require = createRequire(import.meta.url);

/**
 * Absolute path to the on-disk directory containing the 10 raw export
 * *.schema.json files (plus index.json) published by @lifegames/portal-contract.
 * @type {string}
 */
export const RAW_SCHEMAS_DIR = dirname(
  require.resolve('@lifegames/portal-contract/raw-schemas/index.json'),
);

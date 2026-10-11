// Runs the shared widget-rule known answers against the web rules. Invoked from the web
// package so its dependencies resolve: pnpm --filter ./packages/web exec vitest run --config ../../contracts/widget-rules/vitest.config.mjs
import {fileURLToPath} from 'node:url'

export default {test: {root: fileURLToPath(new URL('.', import.meta.url)), include: ['*.test.ts'], environment: 'node'}}

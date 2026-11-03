// D7's focus helper keeps its hiding modes as a literal, because the D7 job installs no
// dependencies. The source of truth is HIDING_FOCUS_MODES in the portal-contract package
// (LP packages/portal-contract, export `./constants`). This suite pins the two equal. It runs
// under `pnpm test:scripts` in governance-gates, where dependencies are installed, and is
// deliberately not in the D7 job.
//
// The repo root does not depend on portal-contract; packages/fixtures does, so the suite takes
// the package name from that manifest. The package exports `import` conditions only, so the
// suite reads the installed package's own exports map and imports the file `./constants`
// names, rather than guessing a dist path.

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import {pathToFileURL} from 'node:url'

import {HIDING_MODES} from '../lib/focus-suppression.mjs'

const REPO_ROOT = path.resolve(import.meta.dirname, '..', '..')
const FIXTURES_DIR = path.join(REPO_ROOT, 'packages', 'fixtures')

async function portalContractConstants() {
  const fixtures = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, 'package.json'), 'utf8'))
  const name = Object.keys({...fixtures.dependencies, ...fixtures.devDependencies}).find((dep) => dep.endsWith('/portal-contract'))
  assert.ok(name, 'packages/fixtures depends on no portal-contract package')
  const dir = fs.realpathSync(path.join(FIXTURES_DIR, 'node_modules', ...name.split('/')))
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'))
  const entry = manifest.exports?.['./constants']?.import
  assert.equal(typeof entry, 'string', `${name} exports no ./constants import entry`)
  return import(pathToFileURL(path.join(dir, entry)).href)
}

test('HIDING_MODES equals portal-contract HIDING_FOCUS_MODES', async () => {
  const {HIDING_FOCUS_MODES} = await portalContractConstants()
  assert.ok(Array.isArray(HIDING_FOCUS_MODES) && HIDING_FOCUS_MODES.length > 0, 'HIDING_FOCUS_MODES is a non-empty list')
  assert.deepEqual([...HIDING_MODES].sort(), [...HIDING_FOCUS_MODES].sort())
})

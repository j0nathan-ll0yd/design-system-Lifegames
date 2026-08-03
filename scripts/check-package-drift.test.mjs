// mantle-cli-output: test file, not a CLI script (marker satisfies scripts/-dir convention scan)
/**
 * Collected automatically by the root `test:scripts` script
 * (`node --test scripts/*.test.mjs`), which pre-push runs as "audit script tests".
 *
 * The known-answer battery itself lives in check-package-drift.mjs as `selfTest()`
 * so that `node scripts/check-package-drift.mjs --self-test` and this suite assert
 * on ONE source of truth — a second copy of the vectors would be free to drift from
 * the shipped check, which is the exact failure mode A2b is about.
 */
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import path from 'node:path'
import {describe, test} from 'node:test'
import {
  classifyChangedPath,
  computeIntroducedHere,
  evaluatePackageDrift,
  matchPattern,
  selectVersionSettingCommit,
  selfTest
} from './check-package-drift.mjs'

const SCRIPT = path.join(import.meta.dirname, 'check-package-drift.mjs')

describe('check-package-drift', () => {
  test('known-answer vectors pass', () => {
    selfTest()
  })

  test('--self-test is reachable through the CLI entrypoint and exits 0', () => {
    const stdout = execFileSync(process.execPath, [SCRIPT, '--self-test'], {encoding: 'utf8'})
    assert.match(stdout, /package version-drift self-test passed/)
  })

  // A2b: prove the battery is capable of catching a real regression rather than
  // asserting a tautology. Each case below is a deliberate mutation of the rule
  // that a naive implementation would get wrong.
  describe('is not vacuous', () => {
    test('a pickaxe-style implementation would return the pre-revert commit; this one returns the revert', () => {
      const history = [{sha: 'revert', version: '1.0.0'}, {sha: 'bump', version: '1.1.0'}, {sha: 'original', version: '1.0.0'}]
      assert.deepEqual(selectVersionSettingCommit('1.0.0', history, true), {sha: 'revert', status: 'found'})
      assert.notEqual(selectVersionSettingCommit('1.0.0', history, true).sha, 'original')
    })

    test('a files[]-only implementation would pass a built package whose src changed', () => {
      const builtPackage = {files: ['dist'], trackedPaths: ['src/index.ts', 'package.json']} // dist/ is gitignored: no tracked match
      assert.equal(classifyChangedPath('src/index.ts', builtPackage.files, true), 'derived-build-input')
      assert.equal(classifyChangedPath('src/index.ts', builtPackage.files, false), null) // committed-dist package: genuinely not publish drift
    })

    test('a basename-matching implementation would swallow the tokens golden-fixture trap', () => {
      assert.equal(matchPattern('dist', '__tests__/golden/dist/x.css'), false)
    })

    test('a shallow graft boundary is not a root commit (a depth-1 clone must not pass)', () => {
      // Regression lock. git prints a graft boundary as parentless, exactly like a
      // real root commit; an earlier draft called that "introduced", and a real
      // `git clone --depth 1` of this repo then reported 0 drifted for all six
      // packages — the gate silently passing in full.
      assert.equal(computeIntroducedHere({parentCount: 0, isShallowBoundary: true, manifestInFirstParent: false}), false)
      assert.equal(computeIntroducedHere({parentCount: 0, isShallowBoundary: false, manifestInFirstParent: false}), true)
    })

    test('shallow history is INDETERMINATE, never a silent CLEAN', () => {
      const result = evaluatePackageDrift({
        name: '@j0nathan-ll0yd/x',
        version: '1.0.0',
        private: false,
        registry: 'https://npm.pkg.github.com',
        files: ['dist'],
        trackedPaths: [],
        changedPaths: [],
        versionSettingCommit: null,
        commitStatus: 'truncated'
      })
      assert.equal(result.verdict, 'INDETERMINATE')
      assert.notEqual(result.verdict, 'CLEAN')
    })
  })
})

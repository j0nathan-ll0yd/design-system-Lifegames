// mantle-cli-output: test file, not a CLI script (marker satisfies scripts/-dir convention scan)
import assert from 'node:assert/strict'
import {existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {describe, test} from 'node:test'

import {
  assertBrandFontsLoaded,
  assertContentRatioStable,
  contentRatio,
  contentRatioSwing,
  imageSnapshotOptions,
  MAX_DIFF_PIXELS,
  SMALLEST_MEASURED_REAL_CHANGE_PIXELS
} from '../apps/storybook/.storybook/test-runner.mjs'
import {mintFromEmptySnapshotDirectory} from '../apps/storybook/.storybook/update-visual-snapshots.mjs'

describe('Storybook content sentinel', () => {
  test('measures pixels outside the known page and decorator backgrounds', () => {
    // 2x1 PNG: one #06060f background pixel and one #ff006e content pixel.
    const halfContentImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAEUlEQVR4AWNkY+P///NXPAMADVEDbuv4+f8AAAAASUVORK5CYII=', 'base64')
    assert.equal(contentRatio(halfContentImage), 0.5)
  })

  test('ignores ordinary content-count variance', () => {
    assert.equal(contentRatioSwing(0.008, 0.01), 0.2)
    assert.doesNotThrow(() => assertContentRatioStable('example--story', 0.008, 0.01))
  })

  test('rejects a component appearing from a blank baseline', () => {
    assert.throws(() => assertContentRatioStable('primitives-skeleton--bar', 0.001161, 0), /Structural content sentinel.*100\.0% relative swing/)
  })

  test('rejects a component losing at least half its content footprint', () => {
    assert.throws(() => assertContentRatioStable('example--story', 0.005, 0.01), /limit 50%/)
  })

  test('ignores background-edge noise when both frames are below the absolute floor', () => {
    assert.equal(contentRatioSwing(0.00009, 0), 0)
    assert.doesNotThrow(() => assertContentRatioStable('blank--story', 0.00009, 0))
  })
})

describe('Storybook pixel bound', () => {
  test('counts pixels, not a share of the frame', () => {
    const options = imageSnapshotOptions('example--story')
    assert.equal(options.failureThresholdType, 'pixel')
    assert.equal(options.failureThreshold, MAX_DIFF_PIXELS)
    assert.equal(options.customSnapshotIdentifier, 'example--story')
  })

  test('sits below the smallest measured real change, so that change fails', () => {
    assert.ok(Number.isInteger(MAX_DIFF_PIXELS) && MAX_DIFF_PIXELS >= 0)
    assert.ok(MAX_DIFF_PIXELS < SMALLEST_MEASURED_REAL_CHANGE_PIXELS,
      `${MAX_DIFF_PIXELS} px would pass a ${SMALLEST_MEASURED_REAL_CHANGE_PIXELS} px real change`)
  })
})

describe('Storybook font wait', () => {
  const loaded = (unicodeRange) => ({unicodeRange, status: 'loaded'})

  test('accepts a story once every brand face is loaded', () => {
    assert.doesNotThrow(() => assertBrandFontsLoaded('example--story', [loaded('U+0000-00FF'), loaded('U+0100-02BA')]))
  })

  test('rejects a story whose page declares no brand face', () => {
    assert.throws(() => assertBrandFontsLoaded('example--story', []), /declares no Space Grotesk @font-face/)
  })

  test('rejects a story with a face that failed or is still loading', () => {
    assert.throws(() => assertBrandFontsLoaded('example--story', [loaded('U+0000-00FF'), {unicodeRange: 'U+0100-02BA', status: 'error'}]),
      /1 of 2 Space Grotesk faces not loaded \(U\+0100-02BA: error\)/)
    assert.throws(() => assertBrandFontsLoaded('example--story', [{unicodeRange: 'U+0000-00FF', status: 'loading'}]), /not loaded/)
  })
})

describe('Storybook visual update', () => {
  test('mints from an empty directory and drops stale and orphaned baselines', (context) => {
    const root = mkdtempSync(join(tmpdir(), 'lifegames-storybook-visual-test-'))
    context.after(() => rmSync(root, {recursive: true, force: true}))

    const snapshotDirectory = join(root, '__snapshots__')
    mkdirSync(join(snapshotDirectory, '__diff__'), {recursive: true})
    writeFileSync(join(snapshotDirectory, 'stale.png'), 'stale')
    writeFileSync(join(snapshotDirectory, 'orphan.png'), 'orphan')
    writeFileSync(join(snapshotDirectory, '__diff__', 'old-diff.png'), 'diff')

    const count = mintFromEmptySnapshotDirectory((emptyDirectory) => {
      assert.equal(existsSync(emptyDirectory), false)
      mkdirSync(emptyDirectory)
      writeFileSync(join(emptyDirectory, 'current-a.png'), 'new-a')
      writeFileSync(join(emptyDirectory, 'current-b.png'), 'new-b')
    }, snapshotDirectory)

    assert.equal(count, 2)
    assert.deepEqual(readdirSync(snapshotDirectory).sort(), ['current-a.png', 'current-b.png'])
  })

  test('restores the old set when the mint fails', (context) => {
    const root = mkdtempSync(join(tmpdir(), 'lifegames-storybook-visual-test-'))
    context.after(() => rmSync(root, {recursive: true, force: true}))

    const snapshotDirectory = join(root, '__snapshots__')
    mkdirSync(snapshotDirectory)
    writeFileSync(join(snapshotDirectory, 'existing.png'), 'existing')

    assert.throws(() =>
      mintFromEmptySnapshotDirectory((emptyDirectory) => {
        mkdirSync(emptyDirectory)
        writeFileSync(join(emptyDirectory, 'partial.png'), 'partial')
        throw new Error('mint failed')
      }, snapshotDirectory), /mint failed/)
    assert.deepEqual(readdirSync(snapshotDirectory), ['existing.png'])
    assert.equal(readFileSync(join(snapshotDirectory, 'existing.png'), 'utf8'), 'existing')
  })

  test('restores the old set when the mint produces no PNGs', (context) => {
    const root = mkdtempSync(join(tmpdir(), 'lifegames-storybook-visual-test-'))
    context.after(() => rmSync(root, {recursive: true, force: true}))

    const snapshotDirectory = join(root, '__snapshots__')
    mkdirSync(snapshotDirectory)
    writeFileSync(join(snapshotDirectory, 'existing.png'), 'existing')

    assert.throws(() => mintFromEmptySnapshotDirectory((emptyDirectory) => mkdirSync(emptyDirectory), snapshotDirectory), /produced no PNG baselines/)
    assert.deepEqual(readdirSync(snapshotDirectory), ['existing.png'])
  })
})

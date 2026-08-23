// mantle-cli-output: test file, not a CLI script (marker satisfies scripts/-dir convention scan)
import assert from 'node:assert/strict'
import {existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {describe, test} from 'node:test'

import {assertContentRatioStable, contentRatio, contentRatioSwing} from '../apps/storybook/.storybook/test-runner.mjs'
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

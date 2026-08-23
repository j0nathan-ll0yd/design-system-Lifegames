// mantle-cli-output: orchestrates the interactive Storybook baseline update command
import {existsSync, readdirSync, readFileSync, renameSync, rmSync} from 'node:fs'
import {basename, dirname, join, resolve} from 'node:path'
import {createRequire} from 'node:module'
import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'

const STORYBOOK_DIR = fileURLToPath(new URL('../', import.meta.url))
const SNAPSHOT_DIR = join(STORYBOOK_DIR, '__snapshots__')

function pngCount(directory) {
  if (!existsSync(directory)) {
    return 0
  }
  return readdirSync(directory, {recursive: true, withFileTypes: true}).filter((entry) => entry.isFile() && entry.name.endsWith('.png')).length
}

/**
 * Move the existing set aside, run a mint against the now-empty canonical path,
 * and restore the old set if the mint does not complete successfully.
 */
export function mintFromEmptySnapshotDirectory(mint, snapshotDirectory = SNAPSHOT_DIR) {
  const backupDirectory = `${snapshotDirectory}.backup-${process.pid}-${Date.now()}`
  const hadExistingSnapshots = existsSync(snapshotDirectory)
  if (hadExistingSnapshots) {
    renameSync(snapshotDirectory, backupDirectory)
  }

  try {
    mint(snapshotDirectory)
    const count = pngCount(snapshotDirectory)
    if (count === 0) {
      throw new Error(`Visual update produced no PNG baselines in ${snapshotDirectory}`)
    }
    rmSync(backupDirectory, {recursive: true, force: true})
    return count
  } catch (error) {
    rmSync(snapshotDirectory, {recursive: true, force: true})
    if (hadExistingSnapshots) {
      renameSync(backupDirectory, snapshotDirectory)
    }
    throw error
  }
}

function testRunnerBin() {
  const require = createRequire(import.meta.url)
  const packagePath = require.resolve('@storybook/test-runner/package.json')
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'))
  const relativeBin = packageJson.bin?.['test-storybook']
  if (!relativeBin) {
    throw new Error('@storybook/test-runner does not declare the test-storybook binary')
  }
  return resolve(dirname(packagePath), relativeBin)
}

export function updateVisualSnapshots() {
  const count = mintFromEmptySnapshotDirectory(() => {
    const result = spawnSync(process.execPath, [testRunnerBin(), '--config-dir', '.storybook', '-u'], {cwd: STORYBOOK_DIR, stdio: 'inherit'})
    if (result.error) {
      throw result.error
    }
    if (result.status !== 0) {
      const ending = result.signal ? `signal ${result.signal}` : `exit ${result.status ?? 'unknown'}`
      throw new Error(`Visual update failed (${ending})`)
    }
  })
  console.log(`Installed ${count} Storybook baselines minted from an empty snapshot directory.`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    updateVisualSnapshots()
  } catch (error) {
    console.error(`[${basename(process.argv[1])}] ${error instanceof Error ? error.message : String(error)}; committed baselines were restored.`)
    process.exitCode = 1
  }
}

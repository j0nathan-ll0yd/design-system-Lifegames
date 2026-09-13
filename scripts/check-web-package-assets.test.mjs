import {test} from 'node:test'
import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import path from 'node:path'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const webPackage = path.join(repoRoot, 'packages/web')

test('@j0nathan-ll0yd/web packs the canonical no-cover asset', () => {
  const packed = spawnSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {cwd: webPackage, encoding: 'utf8'})
  assert.equal(packed.status, 0, packed.stderr || packed.stdout)

  const manifests = JSON.parse(packed.stdout)
  assert.ok(Array.isArray(manifests) && manifests.length === 1, 'npm pack did not return one package manifest')
  const paths = manifests[0].files.map((file) => file.path)
  assert.ok(paths.includes('src/assets/no-cover.svg'), 'src/assets/no-cover.svg is missing from the packed @j0nathan-ll0yd/web tarball')
})

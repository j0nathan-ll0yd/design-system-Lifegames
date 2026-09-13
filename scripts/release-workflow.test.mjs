import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {dirname, resolve} from 'node:path'
import {test} from 'node:test'
import {fileURLToPath} from 'node:url'
import {parse as parseYaml} from 'yaml'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// changesets/action v2 renamed version->version-script, commit->commit-message and
// title->pr-title, and the action IGNORES unknown inputs. release.yml only runs on a
// push to main, so a wrong input name never fails a PR check: the Version PR silently
// falls back to bare `changeset version` with default naming. The sha pin below forces
// a conscious ack of every action bump against these names — an unexercised bump merged
// on stale green is exactly how mantle-LifegamesPortal's main went red (LP #263/#343).
test('release.yml uses the Changesets v2 input names for the version-only action', () => {
  const workflow = parseYaml(readFileSync(resolve(repoRoot, '.github/workflows/release.yml'), 'utf8'))
  const versionStep = workflow.jobs.version.steps.find((step) => step.name === 'Create Version Packages PR')

  assert.ok(versionStep, 'the Version Packages PR step exists')
  assert.equal(versionStep.uses, 'changesets/action@8488615a623b1b9c987934bb89eae8af6a946ac1')
  assert.equal(versionStep.with['version-script'], 'pnpm changeset:version')
  assert.equal(versionStep.with['commit-message'], 'ci(release): version packages')
  assert.equal(versionStep.with['pr-title'], 'ci(release): version packages')
  assert.equal(versionStep.with['github-token'], '${{ secrets.CHANGESETS_TOKEN }}')
  for (const staleName of ['version', 'commit', 'title', 'token', 'publish', 'publish-script']) {
    assert.ok(!(staleName in versionStep.with), `release.yml must not carry the \`${staleName}\` input`)
  }
})

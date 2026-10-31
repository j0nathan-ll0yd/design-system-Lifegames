// mantle-cli-output: test file, not a CLI script (marker satisfies scripts/-dir convention scan)
//
// The Visual Regression workflow runs on pull_request only when a changed path
// matches its `paths:` filter. A story input outside the filter lets a PR change
// what a story draws without the gate running. This suite walks the story import
// graph (the story globs, preview.ts and main.ts staticDirs) and requires every
// first-party file it reaches to match a filter glob. It also pins the build and
// toolchain inputs no import reaches.
import assert from 'node:assert/strict'
import {existsSync, globSync, readFileSync, statSync} from 'node:fs'
import {dirname, join, matchesGlob, relative, resolve} from 'node:path'
import {test} from 'node:test'
import {fileURLToPath} from 'node:url'
import {parse as parseYaml} from 'yaml'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const storybookConfigDir = join(repoRoot, 'apps/storybook/.storybook')
const workflow = parseYaml(readFileSync(join(repoRoot, '.github/workflows/visual-regression.yml'), 'utf8'))
const filterGlobs = workflow.on.pull_request.paths

const toRepoPath = (absolute) => relative(repoRoot, absolute).split('\\').join('/')
const covered = (repoPath) => filterGlobs.some((glob) => matchesGlob(repoPath, glob))

// Inputs no import reaches: the token build that writes the CSS the preview
// imports, the gate's own files, and the toolchain.
const PINNED_INPUTS = [
  'style-dictionary.config.mjs',
  'scripts/emit-platform.mjs',
  'apps/storybook/__snapshots__/primitives-card--default.png',
  'apps/storybook/test-runner-jest.config.mjs',
  'apps/storybook/.storybook/test-runner.mjs',
  '.github/workflows/visual-regression.yml',
  'apps/storybook/package.json',
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  '.nvmrc'
]

// Workspace packages by name, so a bare package import maps to its directory.
const workspacePackages = new Map(globSync(['packages/*/package.json', 'apps/*/package.json'], {cwd: repoRoot}).map((file) => [
  JSON.parse(readFileSync(join(repoRoot, file), 'utf8')).name,
  dirname(file)
]))

const SPECIFIER = /(?:import|export)\s+(?:[^'"]*?\sfrom\s+)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|@import\s+(?:url\()?['"]([^'"]+)['"]/g
const EXTENSIONS = ['', '.ts', '.tsx', '.js', '.mjs', '/index.ts', '/index.js']

function resolveRelative(fromFile, specifier) {
  const base = resolve(dirname(fromFile), specifier)
  for (const extension of EXTENSIONS) {
    const candidate = base + extension
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      return candidate
    }
  }
  throw new Error(`${toRepoPath(fromFile)} imports ${specifier}, which resolves to no file`)
}

/** Every first-party file the entry files reach, plus each workspace package they import. */
function storyInputs(entries) {
  const files = new Set()
  const packages = new Set()
  const queue = [...entries]
  while (queue.length > 0) {
    const file = queue.pop()
    if (files.has(file)) {
      continue
    }
    files.add(file)
    if (!/\.(ts|tsx|js|mjs|css)$/.test(file)) {
      continue
    }
    for (const match of readFileSync(file, 'utf8').matchAll(SPECIFIER)) {
      const specifier = match[1] ?? match[2] ?? match[3]
      if (specifier.startsWith('.')) {
        queue.push(resolveRelative(file, specifier))
      } else {
        const name = specifier.split('/').slice(0, 2).join('/')
        if (workspacePackages.has(name)) {
          packages.add(workspacePackages.get(name))
        }
      }
    }
  }
  return {files: [...files].map(toRepoPath), packages: [...packages]}
}

const mainSource = readFileSync(join(storybookConfigDir, 'main.ts'), 'utf8')
const storyGlobs = [...mainSource.matchAll(/'(\.\.\/[^']*\.stories\.[^']*)'/g)].map((match) => toRepoPath(resolve(storybookConfigDir, match[1])))
const staticDirs = [...mainSource.matchAll(/from:\s*'([^']+)'/g)].map((match) => toRepoPath(resolve(storybookConfigDir, match[1])))
const storyFiles = globSync(storyGlobs, {cwd: repoRoot})

test('visual-regression.yml: main.ts declares story globs and they match story files', () => {
  assert.ok(storyGlobs.length > 0, 'found no story globs in apps/storybook/.storybook/main.ts')
  assert.ok(storyFiles.length > 0, `story globs ${storyGlobs.join(', ')} match no file`)
})

test('visual-regression.yml: the pull_request filter covers every file the story import graph reaches', () => {
  const entries = [...storyFiles.map((file) => join(repoRoot, file)), join(storybookConfigDir, 'preview.ts')]
  const {files} = storyInputs(entries)
  const uncovered = files.filter((file) => !covered(file))
  assert.deepEqual(uncovered, [], `story inputs outside the pull_request paths filter: ${uncovered.join(', ')}`)
})

test('visual-regression.yml: the pull_request filter covers every workspace package a story imports', () => {
  const entries = [...storyFiles.map((file) => join(repoRoot, file)), join(storybookConfigDir, 'preview.ts')]
  const {packages} = storyInputs(entries)
  assert.ok(packages.length > 0, 'the story graph imports no workspace package, so this check guards nothing')
  const uncovered = packages.filter((directory) => !covered(`${directory}/package.json`) || !covered(`${directory}/src/index.ts`))
  assert.deepEqual(uncovered, [], `workspace packages imported by stories but outside the filter: ${uncovered.join(', ')}`)
})

test('visual-regression.yml: the pull_request filter covers every Storybook staticDirs source', () => {
  assert.ok(staticDirs.length > 0, 'main.ts declares no staticDirs; the brand fonts would not be served')
  for (const directory of staticDirs) {
    const files = globSync(`${directory}/*`, {cwd: repoRoot})
    assert.ok(files.length > 0, `staticDirs source ${directory} holds no file`)
    for (const file of files) {
      assert.ok(covered(file), `staticDirs file ${file} is outside the pull_request paths filter`)
    }
  }
})

test('visual-regression.yml: the pull_request filter covers the build, gate and toolchain inputs', () => {
  for (const input of PINNED_INPUTS) {
    assert.ok(existsSync(join(repoRoot, input)), `pinned input ${input} does not exist; update PINNED_INPUTS`)
    assert.ok(covered(input), `${input} is outside the pull_request paths filter`)
  }
})

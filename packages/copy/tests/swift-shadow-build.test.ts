// The copy build's Swift shadowing guard, end to end (atlas decision 0160,
// adversarial review C1): the real `scripts/build.ts` runs against a scratch
// copy of the repository, so a mutation never touches the working tree.
//   - the current tree builds (exit 0);
//   - a copy group titled `Color` exits 1: SwiftUI's Color is referenced
//     unqualified in modules that see LifegamesCopy, though no Sources file
//     declares it;
//   - a public Sources type renamed to a generated copy struct's name exits 1.
import {spawnSync} from 'node:child_process'
import {cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {afterEach, describe, expect, it} from 'vitest'

const COPY = join(__dirname, '..')
const ROOT = join(COPY, '..', '..')
const TSX = join(COPY, 'node_modules', '.bin', 'tsx')

const scratches: string[] = []
afterEach(() => {
  for (const dir of scratches.splice(0)) {
    rmSync(dir, {recursive: true, force: true})
  }
})

/** A scratch repository holding what the copy build reads and writes. */
function scratchRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'copy-shadow-'))
  scratches.push(dir)
  cpSync(join(ROOT, 'Sources'), join(dir, 'Sources'), {recursive: true})
  for (const file of ['Package.swift', '.prettierrc.mjs']) {
    cpSync(join(ROOT, file), join(dir, file))
  }
  symlinkSync(join(ROOT, 'node_modules'), join(dir, 'node_modules'))
  const copy = join(dir, 'packages', 'copy')
  for (const sub of ['schema', 'src', 'scripts']) {
    cpSync(join(COPY, sub), join(copy, sub), {recursive: true})
  }
  cpSync(join(COPY, 'package.json'), join(copy, 'package.json'))
  symlinkSync(join(COPY, 'node_modules'), join(copy, 'node_modules'))
  return dir
}

function edit(path: string, from: string, to: string): void {
  const text = readFileSync(path, 'utf-8')
  expect(text.split(from).length - 1, `${from} occurs once in ${path}`).toBe(1)
  writeFileSync(path, text.replace(from, to))
}

function build(dir: string): {status: number | null; stderr: string} {
  const run = spawnSync(TSX, ['scripts/build.ts'], {cwd: join(dir, 'packages', 'copy'), encoding: 'utf-8'})
  return {status: run.status, stderr: run.stderr}
}

describe('the copy build rejects a Swift name the code in Sources uses', () => {
  it('the current tree builds', () => {
    const {status, stderr} = build(scratchRepo())
    expect(stderr).not.toContain('shadows')
    expect(status).toBe(0)
  }, 60_000)

  it('a copy group titled Color (a SwiftUI type, referenced unqualified) exits 1', () => {
    const dir = scratchRepo()
    edit(join(dir, 'packages', 'copy', 'schema', 'widgets.schema.json'), '"title": "WidgetStateCopy"', '"title": "Color"')
    const {status, stderr} = build(dir)
    expect(stderr).toMatch(/Swift struct "Color" \(namespace "widgets"\) shadows the type Color referenced unqualified in Lifegames\w+/)
    expect(status).toBe(1)
  }, 60_000)

  it('a public Sources type renamed to a generated copy struct name exits 1', () => {
    const dir = scratchRepo()
    // LifegamesTokens cannot see LifegamesCopy, so only the declared-public-type rule applies.
    edit(join(dir, 'Sources', 'LifegamesTokens', 'Spacing.swift'), 'public enum Spacing {', 'public enum WidgetStateCopy {')
    const {status, stderr} = build(dir)
    expect(stderr).toContain('Swift struct "WidgetStateCopy" (namespace "widgets") shadows the public type LifegamesTokens.WidgetStateCopy')
    expect(status).toBe(1)
  }, 60_000)
})

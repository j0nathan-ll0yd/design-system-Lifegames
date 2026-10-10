// Server-safe guard (atlas decision 0160, plan Step 1.3).
//
// The production widgets render on a server runtime (Cloudflare Workers) that
// has no project filesystem. No file under src/production/ or src/widgets/ may
// import a node: module or read process.cwd(). Bookshelf.astro did both until
// this change; this test keeps the class of defect out. src/runtime/ and
// src/components/ are scanned too: the widgets import them, so a node: import
// there reaches the server render just the same.
import {readdirSync, readFileSync, statSync} from 'node:fs'
import {join, relative} from 'node:path'
import {describe, expect, it} from 'vitest'

const SRC = join(__dirname, '../../src')
const ROOTS = ['production', 'widgets', 'runtime', 'components']
const SOURCE_FILE = /\.(astro|ts|tsx|js|mjs)$/

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? walk(path) : SOURCE_FILE.test(name) ? [path] : []
  })
}

// `import x from 'node:fs'`, `import('node:path')`, `require('node:url')`, and
// the bare built-ins a bundler would also resolve on Node (fs, path, ...).
const NODE_IMPORT = /(?:from\s*|import\s*\(\s*|require\s*\(\s*)['"](?:node:[\w/]+|fs|fs\/promises|path|os|child_process|url|module)['"]/
const PROCESS_CWD = /\bprocess\s*\.\s*cwd\s*\(/

const FILES = ROOTS.flatMap((root) => walk(join(SRC, root)))

describe('production widgets are server-safe', () => {
  it('scans a non-empty file set', () => {
    expect(FILES.length).toBeGreaterThan(20)
  })

  it.each(FILES.map((f) => [relative(SRC, f), f]))('%s imports no node: module and never reads process.cwd()', (_rel, file) => {
    const source = readFileSync(file, 'utf8')
    expect(source).not.toMatch(NODE_IMPORT)
    expect(source).not.toMatch(PROCESS_CWD)
  })

  it('the patterns catch the defect they guard against', () => {
    expect("import fs from 'node:fs';").toMatch(NODE_IMPORT)
    expect("import path from 'node:path';").toMatch(NODE_IMPORT)
    expect("const p = await import('node:fs/promises')").toMatch(NODE_IMPORT)
    expect("const publicDir = path.join(process.cwd(), 'public');").toMatch(PROCESS_CWD)
    expect("import { widgets } from '@j0nathan-ll0yd/copy';").not.toMatch(NODE_IMPORT)
  })
})

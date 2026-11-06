#!/usr/bin/env node
// Fails when the built service worker cannot install. Workbox throws
// `add-to-cache-list-conflicting-entries` when one URL reaches the precache list twice with two
// revisions, and the browser then refuses to evaluate sw.js. The build, the tests and the
// screenshots all stay green: @vite-pwa/astro 2 did this to the portfolio (`includeManifestIcons`).
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {pathToFileURL} from 'node:url'

const ENTRY = /\burl:\s*["'`]([^"'`]+)["'`],\s*revision:\s*(null|["'`][^"'`]*["'`])/g
const ORIGIN = 'https://precache.invalid/'

export function readPrecache(source) {
  return [...source.matchAll(ENTRY)].map(([, url, revision]) => ({url: new URL(url, ORIGIN).pathname, revision: revision.replace(/["'`]/g, '')}))
}

export function findConflicts(entries) {
  const revisions = new Map()
  for (const {url, revision} of entries) {
    revisions.set(url, (revisions.get(url) ?? new Set()).add(revision))
  }
  return [...revisions].filter(([, seen]) => seen.size > 1).map(([url, seen]) => ({url, revisions: [...seen]}))
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const file = resolve(process.argv[2] ?? 'apps/portfolio/dist/sw.js')
  const entries = readPrecache(readFileSync(file, 'utf8'))
  const conflicts = findConflicts(entries)
  // Zero entries means this parser no longer reads the output, not that the worker is fine.
  if (entries.length === 0) {
    console.error(`ERROR: ${file} holds no precache entry this check can read`)
    process.exit(1)
  }
  if (conflicts.length > 0) {
    console.error(`ERROR: ${file} precaches a URL under two revisions, so the service worker cannot install:`)
    for (const {url, revisions} of conflicts) {
      console.error(`  ${url}: ${revisions.join(', ')}`)
    }
    process.exit(1)
  }
  console.log(`ok: ${entries.length} precache entries, no URL with two revisions`)
}

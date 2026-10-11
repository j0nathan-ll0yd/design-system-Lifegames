/**
 * The story files Storybook loads, read from Storybook's own main config. D1
 * (d1-widget-matrix.mjs) and the widget inventory (d3-widget-inventory.mjs)
 * both ask "does this widget have a story?"; neither keeps its own list of
 * story roots. A hand-kept list missed packages/web/stories/production/, where
 * most production stories live, so both reported those widgets as story-less.
 *
 * Every failure to read the config throws. A caller that swallowed it would
 * report every widget as story-less, which is the under-report this replaces.
 */

import fs from 'node:fs'
import path from 'node:path'
import {pathToFileURL} from 'node:url'

const ROOT = path.resolve(import.meta.dirname, '..', '..')

export const STORYBOOK_CONFIG_DIR = path.join(ROOT, 'apps/storybook/.storybook')
const STORYBOOK_MAIN_NAMES = ['main.ts', 'main.mts', 'main.js', 'main.mjs']
// Storybook's default `files` glob for a {directory} stories specifier.
const STORYBOOK_DEFAULT_FILES = '**/*.@(mdx|stories.@(js|jsx|mjs|ts|tsx))'

/**
 * Resolves a Storybook config's `stories` field to absolute glob patterns.
 * Accepts the two specifier shapes Storybook documents: a glob string relative
 * to the config directory, and `{directory, files?}`. Throws on anything else.
 *
 * @param {unknown} config - the main config module's default export
 * @param {string} configDir - absolute path of the Storybook config directory
 * @returns {string[]} absolute glob patterns
 */
export function storyGlobs(config, configDir) {
  const stories = config?.stories
  if (!Array.isArray(stories) || stories.length === 0) {
    throw new Error(`Storybook config in ${configDir} has no \`stories\` array (got ${JSON.stringify(stories)}).`)
  }
  return stories.map((entry) => {
    if (typeof entry === 'string' && entry.length > 0 && !entry.startsWith('!')) {
      return path.resolve(configDir, entry)
    }
    if (entry && typeof entry === 'object' && typeof entry.directory === 'string' && (entry.files === undefined || typeof entry.files === 'string')) {
      return path.join(path.resolve(configDir, entry.directory), entry.files ?? STORYBOOK_DEFAULT_FILES)
    }
    throw new Error(`Storybook config in ${configDir} has a \`stories\` entry this reader cannot resolve: ${JSON.stringify(entry)}.`)
  })
}

/**
 * Loads Storybook's main config from `configDir` and returns every story file
 * it loads. Throws when no main config exists, when it fails to load, or when
 * its `stories` field cannot be read.
 *
 * @param {string} [configDir]
 * @returns {Promise<string[]>} absolute story file paths, sorted
 */
export async function readStorybookStoryFiles(configDir = STORYBOOK_CONFIG_DIR) {
  const mainName = STORYBOOK_MAIN_NAMES.find((n) => fs.existsSync(path.join(configDir, n)))
  if (!mainName) {
    throw new Error(`no Storybook main config (${STORYBOOK_MAIN_NAMES.join(', ')}) in ${configDir}.`)
  }
  const mainPath = path.join(configDir, mainName)
  let mod
  try {
    mod = await import(pathToFileURL(mainPath).href)
  } catch (err) {
    throw new Error(`cannot load Storybook config ${mainPath}: ${err.message}`, {cause: err})
  }
  const files = storyGlobs(mod.default, configDir).flatMap((pattern) => fs.globSync(pattern))
  return [...new Set(files)].sort()
}

/** The widget name a story file covers: its basename without the `.stories.<ext>` suffix. */
export function storyStem(file) {
  return path.basename(file).replace(/\.stories\.[^.]+$/, '')
}

// validate.ts registers each schema with Ajv under `urn:<namespace>:<title>`.
// A title with a space ("PinnedRepos Widget") is not a valid URN, and a patched
// fast-uri (>= 3.1.6, Ajv's URI resolver) throws on it, which broke every
// consumer prebuild. These tests pin the encoded key, prove the raw key still
// throws on the resolved fast-uri, and keep every key site on the helper.
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {join} from 'node:path'
import {test} from 'node:test'
import {fileURLToPath} from 'node:url'
import {Ajv} from 'ajv'
import {schemaUrn} from './schema-urn.mjs'

const HERE = fileURLToPath(new URL('.', import.meta.url))
const TITLE = 'PinnedRepos Widget #1/ü?'
const schema = () => ({
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: TITLE,
  type: 'object',
  properties: {id: {type: 'string'}},
  required: ['id'],
  additionalProperties: false
})

test('a title with a space and reserved characters registers and resolves by its encoded URN', () => {
  const ajv = new Ajv({strict: false, allErrors: true})
  ajv.addSchema(schema(), schemaUrn('authored', TITLE))
  const validate = ajv.getSchema(schemaUrn('authored', TITLE))
  assert.ok(validate, 'schema not found under its encoded URN')
  assert.equal(validate({id: 'a'}), true)
  assert.equal(validate({id: 1}), false)
})

test('the raw, unencoded URN throws on the fast-uri Ajv resolves (the pre-fix failure)', () => {
  const fastUriVersion = createRequire(createRequire(import.meta.url).resolve('ajv')).resolve('fast-uri/package.json')
  const version = JSON.parse(readFileSync(fastUriVersion, 'utf8')).version
  const [major, minor, patch] = version.split('.').map(Number)
  assert.ok(major > 3 || (major === 3 && (minor > 1 || patch >= 6)), `fast-uri ${version} predates the strict URN serializer`)
  const ajv = new Ajv({strict: false})
  assert.throws(() => ajv.addSchema(schema(), `urn:authored:${TITLE}`), /URN/)
})

test('titles the old resolver truncated to one key stay distinct', () => {
  assert.notEqual(schemaUrn('authored', 'PinnedRepos Widget'), schemaUrn('authored', 'PinnedRepos'))
  const ajv = new Ajv({strict: false})
  ajv.addSchema({...schema(), title: 'PinnedRepos'}, schemaUrn('authored', 'PinnedRepos'))
  ajv.addSchema(schema(), schemaUrn('authored', 'PinnedRepos Widget'))
  assert.notEqual(ajv.getSchema(schemaUrn('authored', 'PinnedRepos')), ajv.getSchema(schemaUrn('authored', 'PinnedRepos Widget')))
})

test('every schema key site builds its URN through schemaUrn', () => {
  for (const file of ['validate.ts', 'baseline-validate.mjs']) {
    const source = readFileSync(join(HERE, file), 'utf8')
    assert.doesNotMatch(source, /`urn:[a-z]+:\$\{/, `${file} builds a raw urn: key`)
    assert.match(source, /from '\.\/schema-urn\.mjs'/, `${file} does not import schemaUrn`)
  }
})

test('the published package ships every module validate.ts imports', () => {
  const pkg = JSON.parse(readFileSync(join(HERE, '../package.json'), 'utf8'))
  const source = readFileSync(join(HERE, 'validate.ts'), 'utf8')
  for (const [, rel] of source.matchAll(/from '\.\/([^']+)'/g)) {
    assert.ok(pkg.files.includes(`scripts/${rel}`), `scripts/${rel} is imported by validate.ts but not listed in files`)
  }
})

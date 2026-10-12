// The hand-written widget schemas (MANUAL_SCHEMAS in generate-widget-schemas.mjs)
// copy the WidgetState union by hand; the generated schemas derive it from
// packages/web/src/runtime/widget-state.ts. This test keeps the copies equal,
// so adding a state in one place cannot silently skip the other (atlas 0160).
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {test} from 'node:test'
import {fileURLToPath} from 'node:url'

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '../../..')
const schema = (id) => JSON.parse(readFileSync(join(ROOT, 'packages/schemas/generated/widgets', `${id}.schema.json`), 'utf8'))
const stateEnum = (s) => s.properties.state.anyOf.find((b) => b.type === 'string').enum

test('the WidgetState union, the generated enum and the hand-written enums agree', () => {
  const source = readFileSync(join(ROOT, 'packages/web/src/runtime/widget-state.ts'), 'utf8')
  const union = source.match(/export type WidgetState = ([^\n]+)/)?.[1]
  assert.ok(union, 'WidgetState union not found')
  const states = [...union.matchAll(/'([a-z]+)'/g)].map((m) => m[1])
  assert.deepEqual(stateEnum(schema('heart-rate')), states, 'generated heart-rate enum')
  assert.deepEqual(stateEnum(schema('movement-rings')), states, 'hand-written movement-rings enum')
  assert.deepEqual(stateEnum(schema('dev-activity-log')), states, 'hand-written dev-activity-log enum')
})

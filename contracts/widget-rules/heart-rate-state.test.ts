// covers: widget-contract#A Swift widget state rule returns the web rule's state for the same input
// The web half of the HeartRate state known answers (atlas decision 0160).
//
// heart-rate-state.known-answers.json is shared with the Swift twin's suite
// (Tests/LifegamesWidgetsTests/WidgetRulesTests.swift). This file proves the
// web rule returns every expected state, so a change to heartRateState that
// the JSON does not reflect fails here, and a Swift change fails there.
import {readdirSync, readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {describe, expect, it} from 'vitest'
import {heartRateState} from '../../packages/web/src/runtime/widget-rules'
import type {HeartRateProps} from '../../packages/web/src/widgets/health/HeartRate.types'

interface KnownAnswers {
  cases: {name: string; props: HeartRateProps; expected: string}[]
  fixtures: Record<string, string>
}

const answers = JSON.parse(readFileSync(new URL('./heart-rate-state.known-answers.json', import.meta.url), 'utf8')) as KnownAnswers
const fixtureDir = fileURLToPath(new URL('../../Sources/LifegamesWidgets/Resources/widgets/health/', import.meta.url))

describe('heartRateState known answers', () => {
  it.each(answers.cases.map((c) => [c.name, c] as const))('%s', (_name, c) => {
    expect(heartRateState(c.props)).toBe(c.expected)
  })

  it('every shared heart-rate fixture returns its listed state', () => {
    for (const [slug, expected] of Object.entries(answers.fixtures)) {
      const props = JSON.parse(readFileSync(fixtureDir + slug + '.json', 'utf8')) as HeartRateProps
      expect(heartRateState(props), slug).toBe(expected)
    }
  })

  it('lists every heart-rate fixture on disk', () => {
    const onDisk = readdirSync(fixtureDir).filter((f) => f === 'heart-rate.json' || (f.startsWith('heart-rate.') && f.endsWith('.json'))).map((f) =>
      f.slice(0, -'.json'.length)
    ).sort()
    expect(Object.keys(answers.fixtures).sort()).toEqual(onDisk)
  })
})

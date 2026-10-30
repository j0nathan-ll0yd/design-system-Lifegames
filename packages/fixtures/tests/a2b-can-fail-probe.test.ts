import {expect, test} from 'vitest'

// THROWAWAY A2b can-fail probe for the packages context. Reverted in the next commit.
test('a2b can-fail probe: packages must red on a failing fixtures test', () => {
  expect('mutant').toBe('gate')
})

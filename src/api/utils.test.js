import test from 'node:test'
import assert from 'node:assert/strict'
import {
  formatMarketValue,
  getAge,
  getClubFromAssignments,
  parsePositiveInt,
  uniqueBy
} from './utils.js'

test('formatMarketValue formats common values', () => {
  assert.equal(formatMarketValue(1_500_000), '€1.50m')
  assert.equal(formatMarketValue(45_000), '€45k')
  assert.equal(formatMarketValue(null), 'N/A')
})

test('getClubFromAssignments prefers the active club', () => {
  const assignments = [
    { type: 'club', clubName: 'Old Club', endDate: '2024-06-30' },
    { type: 'club', clubName: 'Current Club' }
  ]
  assert.equal(getClubFromAssignments(assignments).clubName, 'Current Club')
})

test('parsePositiveInt rejects invalid page values', () => {
  assert.equal(parsePositiveInt('3'), 3)
  assert.equal(parsePositiveInt('-1'), 1)
  assert.equal(parsePositiveInt('x', 2), 2)
})

test('uniqueBy removes duplicate keys', () => {
  assert.deepEqual(uniqueBy([{ id: 1 }, { id: 1 }, { id: 2 }], item => item.id), [{ id: 1 }, { id: 2 }])
})

test('getAge returns null for invalid dates', () => {
  assert.equal(getAge('not-a-date'), null)
})

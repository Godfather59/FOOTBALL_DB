import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateSimilarity, marketTrend, positionGroup, roleMatches, squadSummary, transferType } from './recruitment.js'

test('positionGroup normalizes football roles', () => {
  assert.equal(positionGroup('Centre-Forward'), 'ST')
  assert.equal(positionGroup({ name: 'Defensive Midfield' }), 'DM')
})

test('roleMatches accepts adjacent roles', () => {
  assert.equal(roleMatches('CM', 'Attacking Midfield'), true)
  assert.equal(roleMatches('GK', 'Right-Back'), false)
})

test('calculateSimilarity prefers same profiles', () => {
  const source = { lifeDates: { age: 22 }, attributes: { position: { name: 'Centre-Forward' }, preferredFoot: { name: 'Right' } }, marketValueDetails: { current: { value: 10_000_000 } } }
  const close = { lifeDates: { age: 23 }, attributes: { position: { name: 'Centre-Forward' }, preferredFoot: { name: 'Right' } }, marketValueDetails: { current: { value: 9_000_000 } } }
  const far = { lifeDates: { age: 33 }, attributes: { position: { name: 'Goalkeeper' }, preferredFoot: { name: 'Left' } }, marketValueDetails: { current: { value: 1_000_000 } } }
  assert.ok(calculateSimilarity(source, close, { goals: 10 }, { goals: 9 }) > calculateSimilarity(source, far, { goals: 10 }, { goals: 0 }))
})

test('transferType recognizes common transfer labels', () => {
  assert.equal(transferType({ type: 'Loan' }), 'Loan')
  assert.equal(transferType({ transferFee: 2_000_000 }), 'Permanent')
})

test('marketTrend compares first and last values', () => {
  assert.equal(marketTrend([{ marketValue: 1 }, { marketValue: 3 }]).direction, 'rising')
})

test('squadSummary identifies missing positions', () => {
  const summary = squadSummary([{ role: 'GK', player: null }, { role: 'ST', player: { age: 22, marketValue: 5_000_000, position: 'Centre-Forward' } }])
  assert.deepEqual(summary.missing, ['GK'])
  assert.equal(summary.playerCount, 1)
})

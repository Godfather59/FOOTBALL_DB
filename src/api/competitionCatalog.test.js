import test from 'node:test'
import assert from 'node:assert/strict'
import { getKnownCompetition, normalizeCompetition, searchKnownCompetitions } from './competitionCatalog.js'

test('finds competitions by common alias', () => {
  const results = searchKnownCompetitions('ucl')
  assert.equal(results[0].code, 'CL')
})

test('finds competition by code case-insensitively', () => {
  assert.equal(getKnownCompetition('gb1').name, 'Premier League')
})

test('normalizes API data with catalog fallback', () => {
  const result = normalizeCompetition({ id: 'MAR1' }, 'MAR1')
  assert.equal(result.name, 'Botola Pro')
  assert.equal(result.country, 'Morocco')
})

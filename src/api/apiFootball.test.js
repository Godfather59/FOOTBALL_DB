import test from 'node:test'
import assert from 'node:assert/strict'
import { apiFootballErrorMessage, chooseApiFootballLeague, normalizeApiFootballPlayer, summarizeApiFootballStatistics } from './apiFootball.js'

test('chooseApiFootballLeague prefers exact country, name and season', () => {
  const payload = { response: [
    { league: { id: 1, name: 'Premier League' }, country: { name: 'Jamaica' }, seasons: [{ year: 2025 }] },
    { league: { id: 39, name: 'Premier League' }, country: { name: 'England' }, seasons: [{ year: 2025, coverage: { players: true } }] }
  ] }
  assert.equal(chooseApiFootballLeague(payload, { name: 'Premier League', country: 'England' }, 2025).row.league.id, 39)
})

test('summarizeApiFootballStatistics aggregates transferred players', () => {
  const totals = summarizeApiFootballStatistics([
    { games: { appearences: 10, minutes: 700, rating: '7.0' }, goals: { total: 4, assists: 3 }, shots: { total: 20, on: 10 }, passes: { key: 11 }, tackles: { total: 3, interceptions: 2 }, cards: { yellow: 1, red: 0, yellowred: 0 } },
    { games: { appearences: 5, minutes: 300, rating: '8.0' }, goals: { total: 2, assists: 1 }, shots: { total: 8, on: 4 }, passes: { key: 5 }, tackles: { total: 2, interceptions: 1 }, cards: { yellow: 0, red: 1, yellowred: 0 } }
  ])
  assert.deepEqual(totals, { appearances: 15, minutes: 1000, goals: 6, assists: 4, shots: 28, shotsOnTarget: 14, keyPasses: 16, tackles: 5, interceptions: 3, yellowCards: 1, redCards: 1, rating: 7.33 })
})

test('normalizeApiFootballPlayer creates a provider-safe identity', () => {
  const profile = normalizeApiFootballPlayer({ player: { id: 276, name: 'Neymar', age: 34, height: '175 cm' }, statistics: [{ team: { id: 1, name: 'Test FC' }, league: { id: 200, season: 2025 }, games: { appearences: 20, minutes: 1500, position: 'Attacker' }, goals: { total: 15, assists: 12 } }] }, 200, 2025)
  assert.equal(profile.id, 'af-276')
  assert.equal(profile.provider, 'api-football')
  assert.equal(profile.attributes.height, 1.75)
  assert.equal(profile.apiFootballStats.goals, 15)
})

test('apiFootballErrorMessage flattens API error objects', () => {
  assert.equal(apiFootballErrorMessage({ plan: 'Free plans do not have access' }), 'Free plans do not have access')
})

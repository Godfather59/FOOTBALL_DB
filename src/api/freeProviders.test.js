import test from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeFootballDataStandings,
  normalizeOpenLigaGoalGetters,
  normalizeSportsDbPlayers,
  normalizeStatsBombCompetitions,
  providerSupports
} from './freeProviders.js'

test('OpenLigaDB goal getters preserve honest limited metrics', () => {
  const result = normalizeOpenLigaGoalGetters([{ goalGetterId: 4, goalGetterName: 'Goal Player', goalCount: 12 }], { openLigaShortcut: 'bl1' }, 2025)
  assert.equal(result.players[0].provider, 'openligadb')
  assert.equal(result.stats['openligadb-4'].goals, 12)
  assert.equal(result.stats['openligadb-4'].assists, null)
})

test('TheSportsDB player search is normalized', () => {
  const players = normalizeSportsDbPlayers({ player: [{ idPlayer: '99', strPlayer: 'Metadata Player', strPosition: 'Midfielder', strTeam: 'Example Club' }] })
  assert.equal(players[0].id, 'thesportsdb-99')
  assert.equal(players[0].clubAssignments[0].clubName, 'Example Club')
})

test('football-data standings use the free total table', () => {
  const rows = normalizeFootballDataStandings({ standings: [{ type: 'TOTAL', table: [{ position: 1, team: { id: 1, name: 'Leader' }, playedGames: 10, won: 8, draw: 1, lost: 1, goalsFor: 20, goalsAgainst: 5, goalDifference: 15, points: 25 }] }] })
  assert.equal(rows[0].teamName, 'Leader')
  assert.equal(rows[0].points, 25)
})

test('StatsBomb competition seasons get stable composite IDs', () => {
  const rows = normalizeStatsBombCompetitions([{ competition_id: 11, season_id: 90, competition_name: 'Example', season_name: '2025/26' }])
  assert.equal(rows[0].id, '11-90')
})

test('provider capability checks avoid pretending unsupported metrics exist', () => {
  assert.equal(providerSupports('api-football', 'assists'), true)
  assert.equal(providerSupports('openligadb', 'assists'), false)
  assert.equal(providerSupports('football-data', 'goals'), false)
})

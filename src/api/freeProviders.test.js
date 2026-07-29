import test from 'node:test'
import assert from 'node:assert/strict'
import {
  FREE_PROVIDERS,
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

test('StatsBomb competition seasons get stable composite IDs', () => {
  const rows = normalizeStatsBombCompetitions([{ competition_id: 11, season_id: 90, competition_name: 'Example', season_name: '2025/26' }])
  assert.equal(rows[0].id, '11-90')
})

test('provider capability checks avoid pretending unsupported metrics exist', () => {
  assert.equal(providerSupports('legacy-competition', 'assists'), true)
  assert.equal(providerSupports('openligadb', 'assists'), false)
  assert.equal(providerSupports('thesportsdb', 'goals'), false)
})

test('all configured providers require no user key', () => {
  assert.ok(FREE_PROVIDERS.every(provider => !provider.keyRequirement.includes('API_') && !provider.keyRequirement.includes('TOKEN')))
})

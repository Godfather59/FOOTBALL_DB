import test from 'node:test'
import assert from 'node:assert/strict'
import { seasonStartYear, summarizeSeasonRange } from './scouting.js'

test('seasonStartYear reads common labels', () => {
  assert.equal(seasonStartYear('2025/26'), 2025)
  assert.equal(seasonStartYear('Season 2023-2024'), 2023)
  assert.equal(seasonStartYear('unknown'), null)
})

test('summarizeSeasonRange aggregates selected seasons', () => {
  const data = { performances: [
    { nameSeason: '2023/24', gamesPlayed: 20, goalsScored: 8, assists: 4, minutesPlayed: 1400 },
    { nameSeason: '2024/25', gamesPlayed: 30, goalsScored: 15, assists: 10, minutesPlayed: 2300 },
    { nameSeason: '2025/26', gamesPlayed: 10, goalsScored: 7, assists: 5, minutesPlayed: 700 }
  ] }
  assert.deepEqual(summarizeSeasonRange(data, '2024', '2025'), { appearances: 40, goals: 22, assists: 15, minutes: 3000 })
})

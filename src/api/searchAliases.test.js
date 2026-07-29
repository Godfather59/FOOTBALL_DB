import test from 'node:test'
import assert from 'node:assert/strict'
import { playerSearchVariants, teamSearchVariants } from './searchAliases.js'

test('Raja official name also searches TheSportsDB name', () => {
  assert.deepEqual(teamSearchVariants('Raja Club Athletic'), ['Raja Club Athletic', 'Raja Casablanca'])
})

test('Raja Casablanca keeps the official-name alternative', () => {
  assert.deepEqual(teamSearchVariants('Raja Casablanca'), ['Raja Casablanca', 'Raja Club Athletic'])
})

test('Sabir and Saber transliterations are both searched', () => {
  assert.deepEqual(playerSearchVariants('Sabir Bougrine'), ['Sabir Bougrine', 'Saber Bougrine'])
})

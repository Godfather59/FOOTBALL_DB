import test from 'node:test'
import assert from 'node:assert/strict'
import { chunk, formatMarketValue, getAge, getClubFromAssignments, getContractOpportunity, monthsUntil, parsePositiveInt, summarizePerformances, uniqueBy } from './utils.js'

test('formatMarketValue formats common values', () => { assert.equal(formatMarketValue(1_500_000), '€1.50m'); assert.equal(formatMarketValue(45_000), '€45k'); assert.equal(formatMarketValue(null), 'N/A') })
test('getClubFromAssignments prefers the active club', () => { const assignments = [{ type:'club',clubName:'Old Club',endDate:'2024-06-30' },{ type:'club',clubName:'Current Club' }]; assert.equal(getClubFromAssignments(assignments).clubName,'Current Club') })
test('parsePositiveInt rejects invalid page values', () => { assert.equal(parsePositiveInt('3'),3); assert.equal(parsePositiveInt('-1'),1); assert.equal(parsePositiveInt('x',2),2) })
test('uniqueBy removes duplicate keys', () => { assert.deepEqual(uniqueBy([{id:1},{id:1},{id:2}],item=>item.id),[{id:1},{id:2}]) })
test('getAge returns null for invalid dates', () => { assert.equal(getAge('not-a-date'),null) })
test('monthsUntil calculates a stable month window', () => { const months=monthsUntil('2026-07-01',new Date('2026-01-01T00:00:00Z')); assert.ok(months>5.9&&months<6.1) })
test('getContractOpportunity identifies free agents and expiring deals', () => { assert.equal(getContractOpportunity({clubAssignments:[]},18,new Date('2026-01-01')).type,'free-agent'); const player={clubAssignments:[{type:'club',clubName:'Test FC',contractEndDate:'2026-06-30'}]}; assert.equal(getContractOpportunity(player,18,new Date('2026-01-01')).type,'expiring') })
test('summarizePerformances totals key statistics', () => { assert.deepEqual(summarizePerformances({performances:[{gamesPlayed:3,goalsScored:2,assists:1},{gamesPlayed:4,goalsScored:1,assists:2}]}),{appearances:7,goals:3,assists:3,minutes:0}) })
test('chunk splits provider ID batches', () => { assert.deepEqual(chunk([1,2,3,4,5],2),[[1,2],[3,4],[5]]) })

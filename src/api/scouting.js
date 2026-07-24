import {
  getClubSquad,
  getCompetitionTable,
  getPlayers,
  getPlayerSeasonalStats,
  getPlayerStatsByCompetition,
  search
} from './client.js'
import { chunk, getPositionName, isAbortError, mapWithConcurrency, summarizePerformances } from './utils.js'

export const MAX_SCOUTING_PROFILES = 240

export function seasonStartYear(value) {
  const match = String(value || '').match(/(?:19|20)\d{2}/)
  return match ? Number(match[0]) : null
}

export function summarizeSeasonRange(data, fromSeason, toSeason) {
  const raw = Array.isArray(data) ? data : data?.performances || data?.data || []
  const rows = Array.isArray(raw) ? raw : []
  const fromYear = seasonStartYear(fromSeason)
  const toYear = seasonStartYear(toSeason)
  return rows.filter(item => {
    const year = seasonStartYear(item.nameSeason || item.seasonName || item.season || item.seasonId)
    return year != null && (fromYear == null || year >= fromYear) && (toYear == null || year <= toYear)
  }).reduce((totals, item) => ({
    appearances: totals.appearances + Number(item.gamesPlayed || item.appearances || 0),
    goals: totals.goals + Number(item.goalsScored || item.goals || 0),
    assists: totals.assists + Number(item.assists || 0),
    minutes: totals.minutes + Number(item.minutesPlayed || item.minutes || 0)
  }), { appearances: 0, goals: 0, assists: 0, minutes: 0 })
}

function squadRows(data) {
  return Array.isArray(data) ? data : data?.squad || data?.players || []
}

function passesProfileFilters(player, filters = {}) {
  const age = player.lifeDates?.age
  const value = Number(player.marketValueDetails?.current?.value || 0)
  if (filters.position && getPositionName(player.attributes?.position) !== filters.position) return false
  if (filters.minAge && (age == null || age < Number(filters.minAge))) return false
  if (filters.maxAge && (age == null || age > Number(filters.maxAge))) return false
  if (filters.minValue && value < Number(filters.minValue) * 1_000_000) return false
  if (filters.maxValue && value > Number(filters.maxValue) * 1_000_000) return false
  return true
}

async function discoverIds(config, options) {
  if (config.source === 'keyword') {
    const result = await search(config.query, options)
    return { ids: result.playerIds || [], clubCount: 0 }
  }
  const table = await getCompetitionTable(config.competitionCode, options)
  const rows = table?.table || table?.standings || []
  const clubIds = [...new Set(rows.map(row => row.clubId || row.club?.id).filter(Boolean).map(String))]
  if (!clubIds.length) throw new Error('The provider did not return club IDs for this competition.')
  const groups = await mapWithConcurrency(clubIds, 3, async clubId => {
    try {
      return squadRows(await getClubSquad(clubId, options))
    } catch (error) {
      if (isAbortError(error)) throw error
      return []
    }
  }, options.signal)
  const ids = [...new Set(groups.flat().map(item => item.playerId || item.id).filter(Boolean).map(String))]
  return { ids, clubCount: clubIds.length }
}

export async function loadScoutingPool(config, options = {}) {
  const discovery = await discoverIds(config, options)
  const limitedIds = discovery.ids.slice(0, MAX_SCOUTING_PROFILES)
  const profileGroups = await mapWithConcurrency(chunk(limitedIds, 20), 2, batch => getPlayers(batch, options), options.signal)
  const profiles = profileGroups.flat().filter(Boolean)
  const candidates = profiles.filter(player => passesProfileFilters(player, config.prefilters))
  const entries = await mapWithConcurrency(candidates, 4, async player => {
    try {
      const data = config.period === 'all-time'
        ? await getPlayerStatsByCompetition(player.id, options)
        : await getPlayerSeasonalStats(player.id, undefined, options)
      const totals = config.period === 'all-time'
        ? summarizePerformances(data)
        : summarizeSeasonRange(data, config.fromSeason, config.toSeason)
      return [String(player.id), totals]
    } catch (error) {
      if (isAbortError(error)) throw error
      return [String(player.id), null]
    }
  }, options.signal)
  return {
    profiles,
    stats: Object.fromEntries(entries),
    coverage: { clubs: discovery.clubCount, discovered: discovery.ids.length, analyzed: profiles.length }
  }
}

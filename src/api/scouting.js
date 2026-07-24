import {
  getApiFootballLeagues,
  getApiFootballPlayers,
  getClubSquad,
  getCompetition,
  getCompetitionTable,
  getPlayers,
  getPlayerSeasonalStats,
  getPlayerStatsByCompetition,
  search
} from './client.js'
import { API_FOOTBALL_MAX_PAGES, chooseApiFootballLeague, normalizeApiFootballPage } from './apiFootball.js'
import { getKnownCompetition } from './competitionCatalog.js'
import { chunk, getPositionName, isAbortError, mapWithConcurrency, summarizePerformances, uniqueBy } from './utils.js'

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

function nestedRows(data, depth = 0) {
  if (depth > 5 || data == null) return []
  if (Array.isArray(data)) return data.flatMap(item => nestedRows(item, depth + 1))
  if (typeof data !== 'object') return []
  const looksLikeClubRow = Boolean(data.clubId || data.teamId || data.participantId || data.club || data.team || data.participant || data.clubName || data.teamName)
  if (looksLikeClubRow) return [data]
  const keys = ['table', 'standings', 'rows', 'data', 'groups', 'group', 'clubs', 'teams', 'participants', 'entries']
  return keys.flatMap(key => nestedRows(data[key], depth + 1))
}

function clubIdFromRow(row) {
  return row?.clubId || row?.club?.id || row?.club?.clubId || row?.teamId || row?.team?.id || row?.team?.teamId || row?.participantId || row?.participant?.id || row?.entity?.id || null
}

function clubNameFromRow(row) {
  if (row?.clubName) return row.clubName
  if (typeof row?.club === 'string') return row.club
  if (row?.club?.name) return row.club.name
  if (row?.teamName) return row.teamName
  if (typeof row?.team === 'string') return row.team
  if (row?.team?.name) return row.team.name
  return row?.participant?.name || row?.entity?.name || row?.name || ''
}

export function competitionClubReferences(data) {
  const ids = new Set()
  const names = new Set()
  for (const row of nestedRows(data)) {
    const id = clubIdFromRow(row)
    const name = clubNameFromRow(row).trim()
    if (id) ids.add(String(id))
    if (name) names.add(name)
  }
  return { ids: [...ids], names: [...names] }
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

async function loadApiFootballPool(config, options) {
  const competition = config.competition || getKnownCompetition(config.competitionCode)
  if (!competition) throw new Error('Select a supported competition.')
  const season = seasonStartYear(config.season)
  if (!season) throw new Error('Enter a valid API-Football season start year, such as 2025.')

  const leaguePayload = await getApiFootballLeagues(competition.apiFootballName || competition.name, season, options)
  const selected = chooseApiFootballLeague(leaguePayload, competition, season)
  if (!selected?.row?.league?.id) throw new Error(`API-Football did not expose ${competition.name} for season ${season}. The free plan may not include that season.`)
  const leagueId = selected.row.league.id
  if (selected.season && selected.season.coverage?.players === false) {
    throw new Error(`API-Football reports that player statistics are unavailable for ${competition.name} in season ${season}.`)
  }

  const first = await getApiFootballPlayers(leagueId, season, 1, options)
  const totalPages = Math.max(1, Number(first?.paging?.total || 1))
  const pageLimit = Math.min(totalPages, Number(config.maxPages || API_FOOTBALL_MAX_PAGES))
  const pages = [first]
  for (let page = 2; page <= pageLimit; page += 1) {
    pages.push(await getApiFootballPlayers(leagueId, season, page, options))
  }
  const profiles = uniqueBy(pages.flatMap(page => normalizeApiFootballPage(page, leagueId, season)), player => player.apiFootballId)
  if (!profiles.length) throw new Error(`API-Football returned no player statistics for ${competition.name} in season ${season}. Try another season available on your plan.`)

  return {
    profiles,
    stats: Object.fromEntries(profiles.map(player => [String(player.id), player.apiFootballStats])),
    coverage: {
      provider: 'api-football',
      league: selected.row.league.name,
      country: selected.row.country?.name || competition.country,
      season,
      pages: pageLimit,
      totalPages,
      analyzed: profiles.length,
      discovered: totalPages * 20,
      truncated: pageLimit < totalPages
    }
  }
}

async function resolveClubNames(names, options) {
  const resolved = await mapWithConcurrency(names, 3, async name => {
    try {
      const result = await search(name, options)
      return result.clubIds?.[0] ? String(result.clubIds[0]) : null
    } catch (error) {
      if (isAbortError(error)) throw error
      return null
    }
  }, options.signal)
  return resolved.filter(Boolean)
}

async function loadSquadPlayerIds(clubIds, options) {
  const groups = await mapWithConcurrency(clubIds, 3, async clubId => {
    try {
      return squadRows(await getClubSquad(clubId, options))
    } catch (error) {
      if (isAbortError(error)) throw error
      return []
    }
  }, options.signal)
  return [...new Set(groups.flat().map(item => item.playerId || item.id).filter(Boolean).map(String))]
}

async function competitionSearchFallback(config, options) {
  const known = getKnownCompetition(config.competitionCode)
  const terms = [...new Set([known?.name, config.competitionCode].filter(Boolean))]
  const results = await mapWithConcurrency(terms, 2, async term => {
    try {
      return await search(term, options)
    } catch (error) {
      if (isAbortError(error)) throw error
      return null
    }
  }, options.signal)
  return {
    playerIds: [...new Set(results.flatMap(result => result?.playerIds || []).map(String))],
    clubIds: [...new Set(results.flatMap(result => result?.clubIds || []).map(String))]
  }
}

async function discoverLegacyIds(config, options) {
  if (config.source === 'legacy-keyword' || config.source === 'keyword') {
    const result = await search(config.query, options)
    return { ids: result.playerIds || [], clubCount: 0, strategy: 'keyword' }
  }
  const [tableResult, competitionResult] = await Promise.allSettled([getCompetitionTable(config.competitionCode, options), getCompetition(config.competitionCode, options)])
  if (tableResult.status === 'rejected' && isAbortError(tableResult.reason)) throw tableResult.reason
  if (competitionResult.status === 'rejected' && isAbortError(competitionResult.reason)) throw competitionResult.reason
  const tableRefs = competitionClubReferences(tableResult.status === 'fulfilled' ? tableResult.value : null)
  const competitionRefs = competitionClubReferences(competitionResult.status === 'fulfilled' ? competitionResult.value : null)
  const directClubIds = [...new Set([...tableRefs.ids, ...competitionRefs.ids])]
  const clubNames = [...new Set([...tableRefs.names, ...competitionRefs.names])]
  const resolvedClubIds = await resolveClubNames(clubNames, options)
  let clubIds = [...new Set([...directClubIds, ...resolvedClubIds])]
  if (clubIds.length) {
    const ids = await loadSquadPlayerIds(clubIds, options)
    if (ids.length) return { ids, clubCount: clubIds.length, strategy: resolvedClubIds.length ? 'resolved standings' : 'standings' }
  }
  const fallback = await competitionSearchFallback(config, options)
  clubIds = [...new Set([...clubIds, ...fallback.clubIds])]
  if (clubIds.length) {
    const ids = await loadSquadPlayerIds(clubIds, options)
    if (ids.length) return { ids, clubCount: clubIds.length, strategy: 'competition search' }
  }
  if (fallback.playerIds.length) return { ids: fallback.playerIds, clubCount: 0, strategy: 'competition player search' }
  throw new Error('The legacy provider did not expose clubs or players. Try a player, club, league or country keyword.')
}

async function loadLegacyPool(config, options) {
  const discovery = await discoverLegacyIds(config, options)
  const limitedIds = discovery.ids.slice(0, MAX_SCOUTING_PROFILES)
  const profileGroups = await mapWithConcurrency(chunk(limitedIds, 20), 2, batch => getPlayers(batch, options), options.signal)
  const profiles = profileGroups.flat().filter(Boolean)
  const candidates = profiles.filter(player => passesProfileFilters(player, config.prefilters))
  const entries = await mapWithConcurrency(candidates, 4, async player => {
    try {
      const data = config.period === 'all-time' ? await getPlayerStatsByCompetition(player.id, options) : await getPlayerSeasonalStats(player.id, undefined, options)
      const totals = config.period === 'all-time' ? summarizePerformances(data) : summarizeSeasonRange(data, config.fromSeason, config.toSeason)
      return [String(player.id), totals]
    } catch (error) {
      if (isAbortError(error)) throw error
      return [String(player.id), null]
    }
  }, options.signal)
  return {
    profiles,
    stats: Object.fromEntries(entries),
    coverage: { provider: 'legacy', clubs: discovery.clubCount, discovered: discovery.ids.length, analyzed: profiles.length, strategy: discovery.strategy }
  }
}

export function loadScoutingPool(config, options = {}) {
  return config.source === 'api-football' ? loadApiFootballPool(config, options) : loadLegacyPool(config, options)
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function ageFromDate(value) {
  const birth = value ? new Date(value) : null
  if (!birth || Number.isNaN(birth.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const month = today.getMonth() - birth.getMonth()
  if (month < 0 || (month === 0 && today.getDate() < birth.getDate())) age -= 1
  return age
}

function playerShell({ id, provider, name, portraitUrl = '', age = null, dateOfBirth = null, nationality = '', position = 'Unknown', clubName = '', clubId = '', crestUrl = '', season = '' }) {
  return {
    id: `${provider}-${id}`,
    provider,
    externalId: String(id || ''),
    name: name || `Player ${id}`,
    portraitUrl,
    lifeDates: { age, dateOfBirth },
    nationality,
    attributes: { position: { name: position || 'Unknown' }, height: null, preferredFoot: null },
    clubAssignments: clubName ? [{ type: 'club', clubName, clubId, crestUrl }] : [],
    marketValueDetails: { current: { value: null } },
    freeProviderSeason: String(season || '')
  }
}

export const FREE_PROVIDERS = [
  {
    id: 'legacy-competition',
    name: 'No-key league scouting',
    keyRequirement: 'No key',
    capabilities: ['player profiles', 'season statistics', 'market values', 'contracts'],
    description: 'Discovers a competition through the existing no-key market-data sources, then applies statistics and recruitment filters. Coverage depends on the unofficial upstream response.'
  },
  {
    id: 'thesportsdb',
    name: 'TheSportsDB',
    keyRequirement: 'No user key',
    capabilities: ['team metadata', 'player metadata', 'league lists', 'images'],
    description: 'Uses TheSportsDB public v1 access built into the application. Free responses are limited but require no account or configuration.'
  },
  {
    id: 'openligadb',
    name: 'OpenLigaDB',
    keyRequirement: 'No key',
    capabilities: ['fixtures', 'results', 'tables', 'goal scorers'],
    description: 'Community-maintained no-key data. Coverage is strongest for German competitions, and scorer records provide goals rather than full performance statistics.'
  },
  {
    id: 'statsbomb-open',
    name: 'StatsBomb Open Data',
    keyRequirement: 'No key',
    capabilities: ['historical matches', 'lineups', 'event data', 'selected 360 data'],
    description: 'Open historical research data for selected competitions. It is not a comprehensive live feed and requires source attribution when publishing analysis.'
  },
  {
    id: 'legacy-keyword',
    name: 'No-key market profile search',
    keyRequirement: 'No key',
    capabilities: ['market values', 'contracts', 'transfer histories', 'career statistics'],
    description: 'Searches the existing no-key market profile sources by player, club, league, country or position. Coverage is keyword-dependent and unofficial.'
  }
]

export const PROVIDER_METRICS = {
  'legacy-competition': new Set(['age', 'position', 'appearances', 'minutes', 'goals', 'assists', 'value', 'contract']),
  'legacy-keyword': new Set(['age', 'position', 'appearances', 'minutes', 'goals', 'assists', 'value', 'contract']),
  openligadb: new Set(['goals']),
  thesportsdb: new Set(['age', 'position']),
  'statsbomb-open': new Set(['events'])
}

export function getFreeProvider(id) {
  return FREE_PROVIDERS.find(provider => provider.id === id) || null
}

export function providerSupports(providerId, metric) {
  return PROVIDER_METRICS[providerId]?.has(metric) || false
}

export function normalizeOpenLigaGoalGetters(payload, competition, season) {
  const rows = Array.isArray(payload) ? payload : []
  const players = []
  const stats = {}
  for (const item of rows) {
    const id = item?.goalGetterId || item?.goalGetterID || item?.goalGetterName
    const name = item?.goalGetterName
    if (!id || !name) continue
    const player = playerShell({ id, provider: 'openligadb', name, season })
    player.openLigaShortcut = competition?.openLigaShortcut || ''
    players.push(player)
    stats[player.id] = {
      appearances: null,
      minutes: null,
      goals: numberOrNull(item.goalCount) ?? 0,
      assists: null,
      rating: null
    }
  }
  return { players, stats }
}

export function normalizeSportsDbPlayers(payload) {
  const rows = Array.isArray(payload?.player) ? payload.player : Array.isArray(payload?.players) ? payload.players : []
  return rows.filter(item => item?.idPlayer || item?.strPlayer).map(item => playerShell({
    id: item.idPlayer || item.strPlayer,
    provider: 'thesportsdb',
    name: item.strPlayer,
    portraitUrl: item.strThumb || item.strCutout || '',
    age: ageFromDate(item.dateBorn),
    dateOfBirth: item.dateBorn || null,
    nationality: item.strNationality || item.strBirthLocation || '',
    position: item.strPosition || 'Unknown',
    clubName: item.strTeam || '',
    clubId: item.idTeam || '',
    season: item.strSigning || ''
  }))
}

export function normalizeSportsDbTeams(payload) {
  const rows = Array.isArray(payload?.teams) ? payload.teams : []
  return rows.map(item => ({
    id: String(item.idTeam || item.strTeam || ''),
    provider: 'thesportsdb',
    name: item.strTeam || 'Unknown team',
    league: item.strLeague || '',
    country: item.strCountry || '',
    stadium: item.strStadium || '',
    formedYear: item.intFormedYear || '',
    badge: item.strBadge || item.strLogo || '',
    description: item.strDescriptionEN || ''
  })).filter(item => item.id)
}

export function normalizeOpenLigaTable(payload) {
  const rows = Array.isArray(payload) ? payload : []
  return rows.map((row, index) => ({
    position: index + 1,
    teamId: row.teamInfoId,
    teamName: row.teamName || row.shortName || '',
    crest: row.teamIconUrl || '',
    played: row.matches,
    won: row.won,
    draw: row.draw,
    lost: row.lost,
    goalsFor: row.goals,
    goalsAgainst: row.opponentGoals,
    goalDifference: row.goalDiff,
    points: row.points
  }))
}

export function normalizeSportsDbTable(payload) {
  const rows = Array.isArray(payload?.table) ? payload.table : []
  return rows.map((row, index) => ({
    position: numberOrNull(row.intRank) ?? index + 1,
    teamId: row.idTeam,
    teamName: row.strTeam || row.name || '',
    crest: row.strBadge || '',
    played: numberOrNull(row.intPlayed),
    won: numberOrNull(row.intWin),
    draw: numberOrNull(row.intDraw),
    lost: numberOrNull(row.intLoss),
    goalsFor: numberOrNull(row.intGoalsFor),
    goalsAgainst: numberOrNull(row.intGoalsAgainst),
    goalDifference: numberOrNull(row.intGoalDifference),
    points: numberOrNull(row.intPoints)
  }))
}

export function normalizeStatsBombCompetitions(payload) {
  const rows = Array.isArray(payload) ? payload : []
  return rows.map(item => ({
    id: `${item.competition_id}-${item.season_id}`,
    competitionId: item.competition_id,
    seasonId: item.season_id,
    name: item.competition_name || '',
    country: item.country_name || '',
    seasonName: item.season_name || '',
    gender: item.competition_gender || '',
    matchUpdated: item.match_updated || ''
  }))
}

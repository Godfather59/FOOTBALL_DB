const API_ROOT = '/api'
const DEFAULT_CACHE_TTL = 5 * 60 * 1000
const DAILY_CACHE_TTL = 24 * 60 * 60 * 1000
const requestCache = new Map()

function makeUrl(source, endpoint) {
  const cleanEndpoint = String(endpoint).replace(/^\/+/, '')
  return `${API_ROOT}/${source}/${cleanEndpoint}`
}

function getCached(key) {
  const cached = requestCache.get(key)
  if (!cached) return null
  if (cached.expiresAt <= Date.now()) {
    requestCache.delete(key)
    return null
  }
  return cached.value
}

function setCached(key, value, ttl) {
  requestCache.set(key, { value, expiresAt: Date.now() + ttl })
}

async function parseResponse(res) {
  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) return res.json()
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function apiFootballError(errors) {
  if (!errors) return ''
  if (Array.isArray(errors)) return errors.filter(Boolean).join(', ')
  if (typeof errors === 'object') return Object.values(errors).filter(Boolean).join(', ')
  return String(errors)
}

async function request(source, endpoint, options = {}) {
  const { signal, cacheTtl = DEFAULT_CACHE_TTL, bypassCache = false } = options
  const url = makeUrl(source, endpoint)
  const cacheKey = `${source}:${endpoint}`

  if (!bypassCache && cacheTtl > 0) {
    const cached = getCached(cacheKey)
    if (cached !== null) return cached
  }

  const res = await fetch(url, { headers: { Accept: 'application/json' }, signal })
  const body = await parseResponse(res)

  if (!res.ok) {
    const detail = typeof body === 'object' && body?.message ? `: ${body.message}` : ''
    throw new Error(`Request failed (${res.status})${detail}`)
  }

  if (source === 'tm' && body?.success === false) {
    throw new Error(body.message || 'Football data API error')
  }
  if (source === 'af') {
    const detail = apiFootballError(body?.errors)
    if (detail) throw new Error(`API-Football: ${detail}`)
  }

  const data = source === 'tm' ? body?.data ?? body : body
  if (!bypassCache && cacheTtl > 0) setCached(cacheKey, data, cacheTtl)
  return data
}

export function clearApiCache() {
  requestCache.clear()
}

export async function search(query, options = {}) {
  const data = await request('tm', `quick-search?term=${encodeURIComponent(query)}`, options)
  const result = data?.result || {}
  return {
    playerIds: result.playerIds || [],
    clubIds: result.clubIds || [],
    competitionIds: result.competitionIds || [],
    totalCount: data?.totalCount || {}
  }
}

export async function getPlayers(ids, options = {}) {
  if (!ids?.length) return []
  const qs = ids.map(id => `ids[]=${encodeURIComponent(id)}`).join('&')
  return request('tm', `players?${qs}`, options)
}

export function getPlayer(id, options = {}) {
  return request('tm', `player/${encodeURIComponent(id)}`, options)
}

export function getPlayerMarketValue(id, options = {}) {
  return request('tm', `player/${encodeURIComponent(id)}/market-value-history`, options)
}

export function getPlayerTransfers(id, options = {}) {
  return request('tm', `transfer/history/player/${encodeURIComponent(id)}`, options)
}

export function getPlayerInjuries(id, options = {}) {
  return request('tm', `player/${encodeURIComponent(id)}/injury`, options)
}

export function getPlayerNationalCareer(id, options = {}) {
  return request('tm', `player/${encodeURIComponent(id)}/national-career-history`, options)
}

export function getPlayerStatsByCompetition(id, options = {}) {
  return request('ce', `player/${encodeURIComponent(id)}/performancepercompetition`, options)
}

export function getPlayerSeasonalStats(id, season, options = {}) {
  const seasonQuery = season ? `?season=${encodeURIComponent(season)}` : ''
  return request('ce', `player/${encodeURIComponent(id)}/performance${seasonQuery}`, options)
}

export async function getClubs(ids, options = {}) {
  if (!ids?.length) return []
  const qs = ids.map(id => `ids[]=${encodeURIComponent(id)}`).join('&')
  return request('tm', `clubs?${qs}`, options)
}

export function getClub(id, options = {}) {
  return request('tm', `club/${encodeURIComponent(id)}`, options)
}

export function getClubSquad(id, options = {}) {
  return request('tm', `club/${encodeURIComponent(id)}/squad`, options)
}

export function getClubStadium(id, options = {}) {
  return request('tm', `club/${encodeURIComponent(id)}/stadium`, options)
}

export function getCompetition(code, options = {}) {
  return request('tm', `competition/${encodeURIComponent(code)}`, options)
}

export function getCompetitionTable(code, options = {}) {
  return request('tm', `competition/${encodeURIComponent(code)}/table`, options)
}

export function getApiFootballLeagues(searchTerm, season, options = {}) {
  const params = new URLSearchParams({ search: searchTerm, season: String(season) })
  return request('af', `leagues?${params}`, { cacheTtl: DAILY_CACHE_TTL, ...options })
}

export function getApiFootballPlayers(leagueId, season, page = 1, options = {}) {
  const params = new URLSearchParams({ league: String(leagueId), season: String(season), page: String(page) })
  return request('af', `players?${params}`, { cacheTtl: DAILY_CACHE_TTL, ...options })
}

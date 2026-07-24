const BASE_URL = 'https://tmapi-alpha.transfermarkt.technology/'
const HEADERS = { Accept: 'application/json' }

async function request(endpoint) {
  const res = await fetch(`${BASE_URL}${endpoint}`, { headers: HEADERS })
  if (!res.ok) {
    let msg = `HTTP ${res.status}`
    try { const b = await res.json(); if (b.message) msg += `: ${b.message}` } catch {}
    throw new Error(msg)
  }
  const body = await res.json()
  if (!body.success) throw new Error(body.message || 'API error')
  return body.data
}

export async function search(query) {
  const data = await request(`quick-search?term=${encodeURIComponent(query)}`)
  return {
    playerIds: data.result.playerIds || [],
    clubIds: data.result.clubIds || [],
    competitionIds: data.result.competitionIds || [],
    totalCount: data.totalCount
  }
}

export async function getPlayers(ids) {
  if (!ids.length) return []
  const qs = ids.map(id => `ids[]=${id}`).join('&')
  return request(`players?${qs}`)
}

export async function getPlayer(id) {
  return request(`player/${id}`)
}

export async function getPlayerMarketValue(id) {
  return request(`player/${id}/market-value-history`)
}

export async function getPlayerTransfers(id) {
  return request(`transfer/history/player/${id}`)
}

export async function getPlayerInjuries(id) {
  return request(`player/${id}/injury`)
}

export async function getPlayerNationalCareer(id) {
  return request(`player/${id}/national-career-history`)
}

const CEAPI_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? ''
  : 'https://www.transfermarkt.com.tr'

export async function getPlayerStatsByCompetition(id) {
  const res = await fetch(`${CEAPI_BASE}/ceapi/player/${id}/performancepercompetition`, {
    headers: { Accept: 'application/json' }
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function getPlayerSeasonalStats(id, season) {
  const url = season
    ? `${CEAPI_BASE}/ceapi/player/${id}/performance?season=${season}`
    : `${CEAPI_BASE}/ceapi/player/${id}/performance`
  const res = await fetch(url, {
    headers: { Accept: 'application/json' }
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function getClubs(ids) {
  if (!ids.length) return []
  const qs = ids.map(id => `ids[]=${id}`).join('&')
  return request(`clubs?${qs}`)
}

export async function getClub(id) {
  return request(`club/${id}`)
}

export async function getClubSquad(id) {
  return request(`club/${id}/squad`)
}

export async function getClubStadium(id) {
  return request(`club/${id}/stadium`)
}

export async function getCompetition(code) {
  return request(`competition/${code}`)
}

export async function getCompetitionTable(code) {
  return request(`competition/${code}/table`)
}

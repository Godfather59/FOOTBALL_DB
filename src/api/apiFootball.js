export const API_FOOTBALL_MAX_PAGES = 8

function number(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function parseHeight(value) {
  const match = String(value || '').match(/\d+(?:\.\d+)?/)
  if (!match) return null
  const centimeters = Number(match[0])
  return Number.isFinite(centimeters) ? centimeters / 100 : null
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function apiFootballErrorMessage(errors) {
  if (!errors) return ''
  if (Array.isArray(errors)) return errors.filter(Boolean).join(', ')
  if (typeof errors === 'object') return Object.values(errors).filter(Boolean).join(', ')
  return String(errors)
}

export function chooseApiFootballLeague(payload, competition, season) {
  const rows = Array.isArray(payload?.response) ? payload.response : []
  const expectedName = normalizeText(competition?.apiFootballName || competition?.name)
  const expectedCountry = normalizeText(competition?.country)
  const requestedSeason = Number(season)

  return rows
    .map(row => {
      const league = row?.league || {}
      const country = row?.country || {}
      const seasons = Array.isArray(row?.seasons) ? row.seasons : []
      const seasonMatch = seasons.find(item => Number(item?.year) === requestedSeason)
      let score = 0
      const name = normalizeText(league.name)
      const countryName = normalizeText(country.name)
      if (name === expectedName) score += 8
      else if (name.includes(expectedName) || expectedName.includes(name)) score += 4
      if (countryName === expectedCountry) score += 5
      if (seasonMatch) score += 4
      if (seasonMatch?.coverage?.players) score += 2
      return { row, score, season: seasonMatch }
    })
    .sort((a, b) => b.score - a.score)[0] || null
}

export function summarizeApiFootballStatistics(statistics) {
  const rows = Array.isArray(statistics) ? statistics : []
  let ratingTotal = 0
  let ratingWeight = 0
  const totals = rows.reduce((sum, item) => {
    const appearances = number(item?.games?.appearences)
    const rating = Number(item?.games?.rating)
    if (Number.isFinite(rating)) {
      const weight = Math.max(appearances, 1)
      ratingTotal += rating * weight
      ratingWeight += weight
    }
    return {
      appearances: sum.appearances + appearances,
      minutes: sum.minutes + number(item?.games?.minutes),
      goals: sum.goals + number(item?.goals?.total),
      assists: sum.assists + number(item?.goals?.assists),
      shots: sum.shots + number(item?.shots?.total),
      shotsOnTarget: sum.shotsOnTarget + number(item?.shots?.on),
      keyPasses: sum.keyPasses + number(item?.passes?.key),
      tackles: sum.tackles + number(item?.tackles?.total),
      interceptions: sum.interceptions + number(item?.tackles?.interceptions),
      yellowCards: sum.yellowCards + number(item?.cards?.yellow),
      redCards: sum.redCards + number(item?.cards?.red) + number(item?.cards?.yellowred)
    }
  }, { appearances: 0, minutes: 0, goals: 0, assists: 0, shots: 0, shotsOnTarget: 0, keyPasses: 0, tackles: 0, interceptions: 0, yellowCards: 0, redCards: 0 })

  return { ...totals, rating: ratingWeight ? Number((ratingTotal / ratingWeight).toFixed(2)) : null }
}

export function normalizeApiFootballPlayer(entry, leagueId, season) {
  const player = entry?.player || {}
  const statistics = Array.isArray(entry?.statistics) ? entry.statistics : []
  const relevant = statistics.filter(item => !leagueId || Number(item?.league?.id) === Number(leagueId))
  const usedStatistics = relevant.length ? relevant : statistics
  const primary = usedStatistics.reduce((best, item) => number(item?.games?.appearences) > number(best?.games?.appearences) ? item : best, usedStatistics[0] || {})
  const totals = summarizeApiFootballStatistics(usedStatistics)
  const externalId = String(player.id || '')

  return {
    id: `af-${externalId}`,
    provider: 'api-football',
    apiFootballId: externalId,
    apiFootballLeagueId: String(leagueId || primary?.league?.id || ''),
    apiFootballSeason: String(season || primary?.league?.season || ''),
    name: player.name || [player.firstname, player.lastname].filter(Boolean).join(' ') || `Player ${externalId}`,
    portraitUrl: player.photo || '',
    lifeDates: { age: player.age ?? null, dateOfBirth: player.birth?.date || null },
    birthPlaceDetails: { placeOfBirth: player.birth?.place || '', countryOfBirth: player.birth?.country || '' },
    nationality: player.nationality || '',
    attributes: {
      position: { name: primary?.games?.position || 'Unknown' },
      height: parseHeight(player.height),
      preferredFoot: null
    },
    clubAssignments: primary?.team?.name ? [{ type: 'club', clubName: primary.team.name, clubId: primary.team.id, crestUrl: primary.team.logo }] : [],
    marketValueDetails: { current: { value: null } },
    apiFootballStats: totals,
    apiFootballDetails: { injured: Boolean(player.injured), weight: player.weight || '', leagueName: primary?.league?.name || '', teamName: primary?.team?.name || '' }
  }
}

export function normalizeApiFootballPage(payload, leagueId, season) {
  const rows = Array.isArray(payload?.response) ? payload.response : []
  return rows.map(entry => normalizeApiFootballPlayer(entry, leagueId, season)).filter(player => player.apiFootballId)
}

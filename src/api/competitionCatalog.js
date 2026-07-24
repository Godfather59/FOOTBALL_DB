export const COMPETITIONS = [
  { code: 'GB1', name: 'Premier League', country: 'England', aliases: ['epl', 'english premier league'] },
  { code: 'ES1', name: 'LaLiga', country: 'Spain', aliases: ['la liga', 'spanish league'] },
  { code: 'IT1', name: 'Serie A', country: 'Italy', aliases: ['italian league'] },
  { code: 'L1', name: 'Bundesliga', country: 'Germany', aliases: ['german league'] },
  { code: 'FR1', name: 'Ligue 1', country: 'France', aliases: ['french league'] },
  { code: 'NL1', name: 'Eredivisie', country: 'Netherlands', aliases: ['dutch league'] },
  { code: 'PO1', name: 'Liga Portugal', country: 'Portugal', aliases: ['primeira liga'] },
  { code: 'TR1', name: 'Süper Lig', country: 'Türkiye', aliases: ['super lig', 'turkish league'] },
  { code: 'SC1', name: 'Scottish Premiership', country: 'Scotland', aliases: ['scottish league'] },
  { code: 'MAR1', name: 'Botola Pro', country: 'Morocco', aliases: ['botola', 'botola pro inwi', 'moroccan league'] },
  { code: 'MLS1', name: 'Major League Soccer', country: 'United States', aliases: ['mls'] },
  { code: 'SA1', name: 'Saudi Pro League', country: 'Saudi Arabia', aliases: ['saudi league', 'rosnh league'] },
  { code: 'CL', name: 'UEFA Champions League', country: 'Europe', aliases: ['champions league', 'ucl'] },
  { code: 'EL', name: 'UEFA Europa League', country: 'Europe', aliases: ['europa league', 'uel'] },
  { code: 'UCOL', name: 'UEFA Conference League', country: 'Europe', aliases: ['conference league', 'uecl'] }
]

export function getKnownCompetition(code) {
  const normalizedCode = String(code || '').toUpperCase()
  return COMPETITIONS.find(item => item.code === normalizedCode) || null
}

export function searchKnownCompetitions(query) {
  const term = String(query || '').trim().toLowerCase()
  if (!term) return []
  return COMPETITIONS.filter(item => {
    const values = [item.code, item.name, item.country, ...(item.aliases || [])]
    return values.some(value => String(value).toLowerCase().includes(term))
  })
}

export function normalizeCompetition(data, fallbackCode) {
  const known = getKnownCompetition(data?.id || data?.code || fallbackCode)
  const code = data?.id || data?.code || data?.competitionId || fallbackCode || known?.code
  return {
    ...data,
    code,
    id: code,
    name: data?.name || data?.shortName || known?.name || `Competition ${code}`,
    country: data?.country?.name || data?.countryName || known?.country || ''
  }
}

export const COMPETITIONS = [
  { code: 'GB1', name: 'Premier League', country: 'England', aliases: ['epl', 'english premier league'], footballDataCode: 'PL', theSportsDbLeague: 'English Premier League' },
  { code: 'ES1', name: 'LaLiga', country: 'Spain', aliases: ['la liga', 'spanish league'], footballDataCode: 'PD', theSportsDbLeague: 'Spanish La Liga' },
  { code: 'IT1', name: 'Serie A', country: 'Italy', aliases: ['italian league'], footballDataCode: 'SA', theSportsDbLeague: 'Italian Serie A' },
  { code: 'L1', name: 'Bundesliga', country: 'Germany', aliases: ['german league'], footballDataCode: 'BL1', openLigaShortcut: 'bl1', theSportsDbLeague: 'German Bundesliga' },
  { code: 'FR1', name: 'Ligue 1', country: 'France', aliases: ['french league'], footballDataCode: 'FL1', theSportsDbLeague: 'French Ligue 1' },
  { code: 'NL1', name: 'Eredivisie', country: 'Netherlands', aliases: ['dutch league'], footballDataCode: 'DED', theSportsDbLeague: 'Dutch Eredivisie' },
  { code: 'PO1', name: 'Liga Portugal', country: 'Portugal', aliases: ['primeira liga'], footballDataCode: 'PPL', theSportsDbLeague: 'Portuguese Primeira Liga' },
  { code: 'TR1', name: 'Süper Lig', country: 'Türkiye', aliases: ['super lig', 'turkish league'], theSportsDbLeague: 'Turkish Super Lig' },
  { code: 'SC1', name: 'Scottish Premiership', country: 'Scotland', aliases: ['scottish league'], theSportsDbLeague: 'Scottish Premier League' },
  { code: 'MAR1', name: 'Botola Pro', country: 'Morocco', aliases: ['botola', 'botola pro inwi', 'moroccan league'], theSportsDbLeague: 'Moroccan Botola Pro' },
  { code: 'MLS1', name: 'Major League Soccer', country: 'United States', aliases: ['mls'], theSportsDbLeague: 'American Major League Soccer' },
  { code: 'SA1', name: 'Saudi Pro League', country: 'Saudi Arabia', aliases: ['saudi league', 'rosnh league'], theSportsDbLeague: 'Saudi Pro League' },
  { code: 'CL', name: 'UEFA Champions League', country: 'Europe', aliases: ['champions league', 'ucl'], footballDataCode: 'CL', theSportsDbLeague: 'UEFA Champions League' },
  { code: 'EL', name: 'UEFA Europa League', country: 'Europe', aliases: ['europa league', 'uel'], theSportsDbLeague: 'UEFA Europa League' },
  { code: 'UCOL', name: 'UEFA Conference League', country: 'Europe', aliases: ['conference league', 'uecl'], theSportsDbLeague: 'UEFA Europa Conference League' }
]

export function getKnownCompetition(code) {
  const normalizedCode = String(code || '').toUpperCase()
  return COMPETITIONS.find(item => item.code === normalizedCode) || null
}

export function searchKnownCompetitions(query) {
  const term = String(query || '').trim().toLowerCase()
  if (!term) return []
  return COMPETITIONS.filter(item => {
    const values = [item.code, item.name, item.country, item.footballDataCode, item.openLigaShortcut, item.theSportsDbLeague, ...(item.aliases || [])]
    return values.some(value => String(value || '').toLowerCase().includes(term))
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

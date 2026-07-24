import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_FOOTBALL_MAX_PAGES } from '../api/apiFootball'
import { COMPETITIONS } from '../api/competitionCatalog'
import { loadScoutingPool, MAX_SCOUTING_PROFILES } from '../api/scouting'
import { formatMarketValue, getClubFromAssignments, getClubName, getContractOpportunity, getImageFallback, getPositionName, isAbortError } from '../api/utils'
import WatchlistButton from '../components/WatchlistButton'
import { CardSkeletonGrid, EmptyState, ErrorState } from '../components/StateMessage'

const DEFAULT_SEASON = String(new Date().getFullYear() - 1)
const INITIAL = { position: '', minAge: '', maxAge: '', minValue: '', maxValue: '', minAppearances: '', minMinutes: '', minGoals: '15', minAssists: '15', contractMonths: '', freeAgentsOnly: false, sort: 'contributions-desc' }
const COMMON_NUMBERS = [['minAge', 'Minimum age', 15, 50], ['maxAge', 'Maximum age', 15, 50], ['minAppearances', 'Minimum appearances', 0], ['minMinutes', 'Minimum minutes', 0], ['minGoals', 'Minimum goals', 0], ['minAssists', 'Minimum assists', 0]]
const MARKET_NUMBERS = [['minValue', 'Minimum value (€m)', 0], ['maxValue', 'Maximum value (€m)', 0]]
const SORTS = [['contributions-desc', 'Most goal contributions'], ['goals-desc', 'Most goals'], ['assists-desc', 'Most assists'], ['rating-desc', 'Highest rating'], ['value-desc', 'Highest value'], ['value-asc', 'Lowest value'], ['age-asc', 'Youngest']]
const DOMESTIC_COMPETITIONS = COMPETITIONS.filter(item => !['CL', 'EL', 'UCOL'].includes(item.code))

function legacyPeriodText(config) {
  if (config.period === 'all-time') return 'all career data'
  if (config.fromSeason && config.toSeason && config.fromSeason === config.toSeason) return `season ${config.fromSeason}`
  if (config.fromSeason && config.toSeason) return `seasons ${config.fromSeason}–${config.toSeason}`
  return config.fromSeason ? `season ${config.fromSeason} onward` : 'available seasons'
}

function resultSummary(run, coverage) {
  if (coverage.provider === 'api-football') {
    const truncation = coverage.truncated ? ` · first ${coverage.pages} of ${coverage.totalPages} pages` : ` · ${coverage.pages} page${coverage.pages === 1 ? '' : 's'}`
    return `${coverage.league} · season ${coverage.season}/${String(coverage.season + 1).slice(-2)}${truncation}`
  }
  return `${legacyPeriodText(run)}${coverage.strategy ? ` · ${coverage.strategy}` : ''}`
}

export default function Scouting() {
  const navigate = useNavigate()
  const [source, setSource] = useState('api-football')
  const [competitionCode, setCompetitionCode] = useState('MAR1')
  const [season, setSeason] = useState(DEFAULT_SEASON)
  const [query, setQuery] = useState('')
  const [period, setPeriod] = useState('season-range')
  const [fromSeason, setFromSeason] = useState(DEFAULT_SEASON)
  const [toSeason, setToSeason] = useState('')
  const [run, setRun] = useState(null)
  const [players, setPlayers] = useState([])
  const [stats, setStats] = useState({})
  const [filters, setFilters] = useState(INITIAL)
  const [coverage, setCoverage] = useState({ analyzed: 0, discovered: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    if (!run) return undefined
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    setPlayers([])
    setStats({})
    loadScoutingPool(run, { signal: controller.signal, bypassCache: retry > 0 })
      .then(result => {
        if (!controller.signal.aborted) {
          setPlayers(result.profiles)
          setStats(result.stats)
          setCoverage(result.coverage)
        }
      })
      .catch(loadError => {
        if (!isAbortError(loadError)) setError(loadError.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [run, retry])

  const positions = useMemo(() => [...new Set(players.map(player => getPositionName(player.attributes?.position)).filter(Boolean))].sort(), [players])
  const results = useMemo(() => players.filter(player => {
    const playerStats = stats[player.id]
    const age = player.lifeDates?.age
    const value = Number(player.marketValueDetails?.current?.value || 0)
    if (filters.position && getPositionName(player.attributes?.position) !== filters.position) return false
    if (filters.minAge && (age == null || age < Number(filters.minAge))) return false
    if (filters.maxAge && (age == null || age > Number(filters.maxAge))) return false
    if (source !== 'api-football' && filters.minValue && value < Number(filters.minValue) * 1_000_000) return false
    if (source !== 'api-football' && filters.maxValue && value > Number(filters.maxValue) * 1_000_000) return false
    if (filters.minAppearances && (!playerStats || playerStats.appearances < Number(filters.minAppearances))) return false
    if (filters.minMinutes && (!playerStats || playerStats.minutes < Number(filters.minMinutes))) return false
    if (filters.minGoals && (!playerStats || playerStats.goals < Number(filters.minGoals))) return false
    if (filters.minAssists && (!playerStats || playerStats.assists < Number(filters.minAssists))) return false
    if (source !== 'api-football') {
      const opportunity = getContractOpportunity(player, Number(filters.contractMonths || 18))
      if (filters.contractMonths && !['free-agent', 'expired', 'expiring'].includes(opportunity.type)) return false
      if (filters.freeAgentsOnly && opportunity.type !== 'free-agent') return false
    }
    return true
  }).sort((a, b) => {
    const first = stats[a.id] || {}
    const second = stats[b.id] || {}
    if (filters.sort === 'age-asc') return Number(a.lifeDates?.age ?? 99) - Number(b.lifeDates?.age ?? 99)
    if (filters.sort === 'goals-desc') return Number(second.goals || 0) - Number(first.goals || 0)
    if (filters.sort === 'assists-desc') return Number(second.assists || 0) - Number(first.assists || 0)
    if (filters.sort === 'rating-desc') return Number(second.rating || 0) - Number(first.rating || 0)
    if (filters.sort === 'contributions-desc') return Number(second.goals || 0) + Number(second.assists || 0) - Number(first.goals || 0) - Number(first.assists || 0)
    if (filters.sort === 'value-asc') return Number(a.marketValueDetails?.current?.value || 0) - Number(b.marketValueDetails?.current?.value || 0)
    return Number(b.marketValueDetails?.current?.value || 0) - Number(a.marketValueDetails?.current?.value || 0)
  }), [players, stats, filters, source])

  const setFilter = (key, value) => setFilters(current => ({ ...current, [key]: value }))

  function submit(event) {
    event.preventDefault()
    setError(null)
    const competition = DOMESTIC_COMPETITIONS.find(item => item.code === competitionCode)
    if (source === 'api-football') {
      if (!season.trim()) return setError('Enter a season start year, such as 2025.')
      setRun({ source, competitionCode, competition, season: season.trim(), maxPages: API_FOOTBALL_MAX_PAGES, prefilters: { position: filters.position, minAge: filters.minAge, maxAge: filters.maxAge } })
      return
    }
    if (!query.trim()) return setError('Enter a player, club, league, country or position keyword.')
    if (period === 'season-range' && !fromSeason.trim() && !toSeason.trim()) return setError('Enter a season start year, such as 2025.')
    setRun({ source: 'legacy-keyword', query: query.trim(), period, fromSeason: fromSeason.trim(), toSeason: toSeason.trim(), prefilters: { position: filters.position, minAge: filters.minAge, maxAge: filters.maxAge, minValue: filters.minValue, maxValue: filters.maxValue } })
  }

  return (
    <div>
      <div className="page-heading"><div><span className="eyebrow">Recruitment workspace</span><h1>Advanced scouting</h1></div></div>
      <form className="filter-panel" onSubmit={submit}>
        <div className="filter-grid scouting-filter-grid">
          <label>Data source<select value={source} onChange={event => setSource(event.target.value)}><option value="api-football">API-Football league statistics</option><option value="legacy-keyword">Market value and contracts keyword</option></select></label>
          {source === 'api-football' ? <>
            <label>Competition<select value={competitionCode} onChange={event => setCompetitionCode(event.target.value)}>{DOMESTIC_COMPETITIONS.map(item => <option key={item.code} value={item.code}>{item.name} · {item.country}</option>)}</select></label>
            <label>Season start year<input inputMode="numeric" value={season} onChange={event => setSeason(event.target.value)} placeholder="2025" /></label>
          </> : <>
            <label>Keyword<input value={query} onChange={event => setQuery(event.target.value)} placeholder="Player, club, league, country or position" /></label>
            <label>Statistics period<select value={period} onChange={event => setPeriod(event.target.value)}><option value="season-range">Season or range</option><option value="all-time">All career</option></select></label>
            {period === 'season-range' && <><label>From season<input inputMode="numeric" value={fromSeason} onChange={event => setFromSeason(event.target.value)} placeholder="2025" /></label><label>To season (optional)<input inputMode="numeric" value={toSeason} onChange={event => setToSeason(event.target.value)} placeholder="2025" /></label></>}
          </>}
          <label>Position<select value={filters.position} onChange={event => setFilter('position', event.target.value)}><option value="">All positions</option>{positions.map(positionName => <option key={positionName}>{positionName}</option>)}</select></label>
          {COMMON_NUMBERS.map(([key, label, min, max]) => <label key={key}>{label}<input type="number" min={min} max={max} value={filters[key]} onChange={event => setFilter(key, event.target.value)} /></label>)}
          {source !== 'api-football' && MARKET_NUMBERS.map(([key, label, min]) => <label key={key}>{label}<input type="number" min={min} value={filters[key]} onChange={event => setFilter(key, event.target.value)} /></label>)}
          {source !== 'api-football' && <label>Contract expires within<select value={filters.contractMonths} onChange={event => setFilter('contractMonths', event.target.value)}><option value="">Any contract</option>{[6, 12, 18, 24].map(months => <option key={months} value={months}>{months} months</option>)}</select></label>}
          <label>Sort results<select value={filters.sort} onChange={event => setFilter('sort', event.target.value)}>{SORTS.filter(([value]) => source === 'api-football' || value !== 'rating-desc').map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>
        </div>
        <div className="heading-actions">
          {source !== 'api-football' && <label className="advanced-toggle"><input type="checkbox" checked={filters.freeAgentsOnly} onChange={event => setFilter('freeAgentsOnly', event.target.checked)} /> Free agents only</label>}
          <button className="text-link reset-button" type="button" onClick={() => setFilters(INITIAL)}>Reset filters</button>
          <button className="primary-button">Find players</button>
        </div>
        {source === 'api-football'
          ? <p className="filter-note">API-Football returns 20 players per page. Football DB loads up to {API_FOOTBALL_MAX_PAGES} cached pages ({API_FOOTBALL_MAX_PAGES * 20} players) per search to stay within the free plan’s request limits. Market values and contracts are not supplied by this API.</p>
          : <p className="filter-note">The legacy source supports market values, contracts and broader periods, but its keyword search may expose only part of the available player database.</p>}
      </form>

      {error && <ErrorState message={error} onRetry={run ? () => setRetry(value => value + 1) : undefined} />}
      {loading && <CardSkeletonGrid count={8} />}
      {!run && !loading && <EmptyState title="Build a scouting brief" message="Choose a competition and season. No player name is required with API-Football." />}
      {!loading && !error && run && !results.length && <EmptyState title="No profiles match" message="Try another season or lower a goals, assists, appearances or minutes threshold." />}

      {!loading && !error && run && results.length > 0 && <>
        <p className="result-summary"><strong>{results.length}</strong> matches from {coverage.analyzed} analyzed · {resultSummary(run, coverage)}.</p>
        <div className="card-grid scouting-grid">
          {results.map(player => {
            const club = getClubFromAssignments(player.clubAssignments)
            const playerStats = stats[player.id]
            const isApiFootball = player.provider === 'api-football'
            const opportunity = isApiFootball ? null : getContractOpportunity(player, Number(filters.contractMonths || 18))
            return <article className={`card scout-card ${isApiFootball ? 'api-football-card' : ''}`} key={player.id} onClick={isApiFootball ? undefined : () => navigate(`/players/${player.id}`)}>
              <div className="scout-card-top"><img src={player.portraitUrl} alt="" onError={getImageFallback} /><div><h2>{player.name}</h2><p>{getPositionName(player.attributes?.position) || 'Position unavailable'}</p><small>{getClubName(club) || 'Club unavailable'}</small></div></div>
              <div className="scout-metrics scouting-metrics-wide">{[['Apps', playerStats?.appearances], ['Goals', playerStats?.goals], ['Assists', playerStats?.assists], ['Minutes', playerStats?.minutes], ['Rating', playerStats?.rating]].map(([label, value]) => <span key={label}>{label}<strong>{value ?? '-'}</strong></span>)}</div>
              {isApiFootball ? <div className="api-football-actions"><span className="provider-badge">API-Football · {player.apiFootballSeason}</span><button className="secondary-button" type="button" onClick={() => navigate(`/players?q=${encodeURIComponent(player.name)}`)}>Find market profile</button></div> : <><div className="card-actions"><strong className="card-price">{formatMarketValue(player.marketValueDetails?.current?.value)}</strong><span className={`opportunity-badge ${opportunity.type}`}>{opportunity.label}</span></div><WatchlistButton player={player} compact /></>}
            </article>
          })}
        </div>
      </>}
    </div>
  )
}

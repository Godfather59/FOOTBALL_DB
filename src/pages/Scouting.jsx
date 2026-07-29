import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { COMPETITIONS } from '../api/competitionCatalog'
import { getFreeProvider, providerSupports } from '../api/freeProviders'
import { loadScoutingPool } from '../api/scouting'
import { formatMarketValue, getClubFromAssignments, getClubName, getContractOpportunity, getImageFallback, getPositionName, isAbortError } from '../api/utils'
import WatchlistButton from '../components/WatchlistButton'
import { CardSkeletonGrid, EmptyState, ErrorState } from '../components/StateMessage'

const DEFAULT_SEASON = String(new Date().getFullYear() - 1)
const INITIAL = { position: '', minAge: '', maxAge: '', minValue: '', maxValue: '', minAppearances: '', minMinutes: '', minGoals: '', minAssists: '', contractMonths: '', freeAgentsOnly: false, sort: 'goals-desc' }
const NUMBER_FILTERS = {
  age: [['minAge', 'Minimum age', 15, 50], ['maxAge', 'Maximum age', 15, 50]],
  appearances: [['minAppearances', 'Minimum appearances', 0]],
  minutes: [['minMinutes', 'Minimum minutes', 0]],
  goals: [['minGoals', 'Minimum goals', 0]],
  assists: [['minAssists', 'Minimum assists', 0]],
  value: [['minValue', 'Minimum value (€m)', 0], ['maxValue', 'Maximum value (€m)', 0]]
}
const SORTS = [
  ['contributions-desc', 'Most goal contributions', 'assists'],
  ['goals-desc', 'Most goals', 'goals'],
  ['assists-desc', 'Most assists', 'assists'],
  ['value-desc', 'Highest value', 'value'],
  ['value-asc', 'Lowest value', 'value'],
  ['age-asc', 'Youngest', 'age']
]
const DOMESTIC_COMPETITIONS = COMPETITIONS.filter(item => !['CL', 'EL', 'UCOL'].includes(item.code))
const PROVIDER_LABELS = {
  openligadb: 'OpenLigaDB',
  'legacy-competition': 'No-key league scouting',
  'legacy-keyword': 'No-key market profile search'
}

function sourceCompetitions(source) {
  if (source === 'openligadb') return DOMESTIC_COMPETITIONS.filter(item => item.openLigaShortcut)
  return DOMESTIC_COMPETITIONS
}

function periodText(config) {
  if (config.period === 'all-time') return 'all career data'
  if (config.fromSeason && config.toSeason && config.fromSeason === config.toSeason) return `season ${config.fromSeason}`
  if (config.fromSeason && config.toSeason) return `seasons ${config.fromSeason}–${config.toSeason}`
  return config.fromSeason ? `season ${config.fromSeason} onward` : 'available seasons'
}

function resultSummary(run, coverage) {
  if (coverage.provider === 'openligadb') {
    const season = coverage.season ? ` · season ${coverage.season}/${String(Number(coverage.season) + 1).slice(-2)}` : ''
    return `OpenLigaDB${coverage.league ? ` · ${coverage.league}` : ''}${season}`
  }
  return `${PROVIDER_LABELS[coverage.provider] || coverage.provider} · ${periodText(run)}${coverage.strategy ? ` · ${coverage.strategy}` : ''}`
}

function metricValue(stats, metric) {
  if (!stats) return null
  const value = stats[metric]
  return value === null || value === undefined || value === '' ? null : Number(value)
}

export default function Scouting() {
  const navigate = useNavigate()
  const [source, setSource] = useState('legacy-competition')
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
    setCoverage({ analyzed: 0, discovered: 0 })
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

  const positions = useMemo(() => [...new Set(players.map(player => getPositionName(player.attributes?.position)).filter(name => name && name !== 'Unknown'))].sort(), [players])
  const effectiveProvider = coverage.provider || source
  const canUse = metric => providerSupports(effectiveProvider, metric)
  const isMarketSource = source !== 'openligadb'

  const results = useMemo(() => players.filter(player => {
    const playerStats = stats[player.id]
    const age = player.lifeDates?.age
    const value = Number(player.marketValueDetails?.current?.value || 0)
    if (filters.position && getPositionName(player.attributes?.position) !== filters.position) return false
    if (filters.minAge && (age == null || age < Number(filters.minAge))) return false
    if (filters.maxAge && (age == null || age > Number(filters.maxAge))) return false
    if (isMarketSource && filters.minValue && value < Number(filters.minValue) * 1_000_000) return false
    if (isMarketSource && filters.maxValue && value > Number(filters.maxValue) * 1_000_000) return false
    for (const [filterKey, metric] of [['minAppearances', 'appearances'], ['minMinutes', 'minutes'], ['minGoals', 'goals'], ['minAssists', 'assists']]) {
      if (!filters[filterKey]) continue
      const actual = metricValue(playerStats, metric)
      if (actual === null || actual < Number(filters[filterKey])) return false
    }
    if (isMarketSource) {
      const opportunity = getContractOpportunity(player, Number(filters.contractMonths || 18))
      if (filters.contractMonths && !['free-agent', 'expired', 'expiring'].includes(opportunity.type)) return false
      if (filters.freeAgentsOnly && opportunity.type !== 'free-agent') return false
    }
    return true
  }).sort((firstPlayer, secondPlayer) => {
    const first = stats[firstPlayer.id] || {}
    const second = stats[secondPlayer.id] || {}
    if (filters.sort === 'age-asc') return Number(firstPlayer.lifeDates?.age ?? 99) - Number(secondPlayer.lifeDates?.age ?? 99)
    if (filters.sort === 'goals-desc') return Number(second.goals || 0) - Number(first.goals || 0)
    if (filters.sort === 'assists-desc') return Number(second.assists || 0) - Number(first.assists || 0)
    if (filters.sort === 'contributions-desc') return Number(second.goals || 0) + Number(second.assists || 0) - Number(first.goals || 0) - Number(first.assists || 0)
    if (filters.sort === 'value-asc') return Number(firstPlayer.marketValueDetails?.current?.value || 0) - Number(secondPlayer.marketValueDetails?.current?.value || 0)
    return Number(secondPlayer.marketValueDetails?.current?.value || 0) - Number(firstPlayer.marketValueDetails?.current?.value || 0)
  }), [players, stats, filters, isMarketSource])

  const setFilter = (key, value) => setFilters(current => ({ ...current, [key]: value }))
  const competitions = sourceCompetitions(source)
  const availableSorts = SORTS.filter(([, , metric]) => providerSupports(effectiveProvider, metric))

  function changeSource(nextSource) {
    setSource(nextSource)
    setRun(null)
    setPlayers([])
    setStats({})
    setCoverage({ analyzed: 0, discovered: 0 })
    const nextCompetitions = sourceCompetitions(nextSource)
    if (nextSource !== 'legacy-keyword' && !nextCompetitions.some(item => item.code === competitionCode)) setCompetitionCode(nextCompetitions[0]?.code || 'GB1')
    setFilters(current => ({ ...current, sort: nextSource === 'openligadb' ? 'goals-desc' : current.sort }))
  }

  function submit(event) {
    event.preventDefault()
    setError(null)
    if (source === 'legacy-keyword' && !query.trim()) return setError('Enter a player, club, league, country or position keyword.')
    if (source === 'openligadb') {
      if (!season.trim()) return setError('Enter a season start year, such as 2025.')
      const competition = competitions.find(item => item.code === competitionCode)
      if (!competition) return setError('Select a competition supported by OpenLigaDB.')
      setRun({ source, competitionCode, competition, season: season.trim(), prefilters: { position: filters.position, minAge: filters.minAge, maxAge: filters.maxAge } })
      return
    }
    if (period === 'season-range' && !fromSeason.trim() && !toSeason.trim()) return setError('Enter a season start year, such as 2025.')
    const competition = competitions.find(item => item.code === competitionCode)
    setRun({
      source,
      query: query.trim(),
      competitionCode,
      competition,
      period,
      fromSeason: fromSeason.trim(),
      toSeason: toSeason.trim(),
      prefilters: { position: filters.position, minAge: filters.minAge, maxAge: filters.maxAge, minValue: filters.minValue, maxValue: filters.maxValue }
    })
  }

  const providerInfo = getFreeProvider(source)
  return (
    <div>
      <div className="page-heading"><div><span className="eyebrow">Zero-key recruitment workspace</span><h1>Advanced scouting</h1></div><button className="secondary-button" type="button" onClick={() => navigate('/data-hub')}>Free data hub</button></div>
      <form className="filter-panel" onSubmit={submit}>
        <div className="filter-grid scouting-filter-grid">
          <label>Data source<select value={source} onChange={event => changeSource(event.target.value)}>
            <option value="legacy-competition">No-key league scouting</option>
            <option value="openligadb">OpenLigaDB goal scorers</option>
            <option value="legacy-keyword">No-key keyword search</option>
          </select></label>
          {source === 'legacy-keyword' ? <label>Keyword<input value={query} onChange={event => setQuery(event.target.value)} placeholder="Player, club, league, country or position" /></label> : <label>Competition<select value={competitionCode} onChange={event => setCompetitionCode(event.target.value)}>{competitions.map(item => <option key={item.code} value={item.code}>{item.name} · {item.country}</option>)}</select></label>}
          {source === 'openligadb' ? <label>Season start year<input inputMode="numeric" value={season} onChange={event => setSeason(event.target.value)} placeholder="2025" /></label> : <>
            <label>Statistics period<select value={period} onChange={event => setPeriod(event.target.value)}><option value="season-range">Season or range</option><option value="all-time">All career</option></select></label>
            {period === 'season-range' && <><label>From season<input inputMode="numeric" value={fromSeason} onChange={event => setFromSeason(event.target.value)} placeholder="2025" /></label><label>To season (optional)<input inputMode="numeric" value={toSeason} onChange={event => setToSeason(event.target.value)} placeholder="2025" /></label></>}
          </>}
          {canUse('position') && <label>Position<select value={filters.position} onChange={event => setFilter('position', event.target.value)}><option value="">All positions</option>{positions.map(positionName => <option key={positionName}>{positionName}</option>)}</select></label>}
          {Object.entries(NUMBER_FILTERS).flatMap(([metric, fields]) => canUse(metric) ? fields.map(([key, label, min, max]) => <label key={key}>{label}<input type="number" min={min} max={max} value={filters[key]} onChange={event => setFilter(key, event.target.value)} /></label>) : [])}
          {isMarketSource && <label>Contract expires within<select value={filters.contractMonths} onChange={event => setFilter('contractMonths', event.target.value)}><option value="">Any contract</option>{[6, 12, 18, 24].map(months => <option key={months} value={months}>{months} months</option>)}</select></label>}
          <label>Sort results<select value={filters.sort} onChange={event => setFilter('sort', event.target.value)}>{availableSorts.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>
        </div>
        <div className="heading-actions">
          {isMarketSource && <label className="advanced-toggle"><input type="checkbox" checked={filters.freeAgentsOnly} onChange={event => setFilter('freeAgentsOnly', event.target.checked)} /> Free agents only</label>}
          <button className="text-link reset-button" type="button" onClick={() => setFilters(INITIAL)}>Reset filters</button>
          <button className="primary-button">Find players</button>
        </div>
        <p className="filter-note"><strong>{providerInfo?.name}:</strong> {providerInfo?.description} No account, token or private API key is required.</p>
      </form>

      {error && <ErrorState message={error} onRetry={run ? () => setRetry(value => value + 1) : undefined} />}
      {loading && <CardSkeletonGrid count={8} />}
      {!run && !loading && <EmptyState title="Build a zero-key scouting brief" message="Choose a competition or keyword and apply only the filters supported by the selected no-key source." />}
      {!loading && !error && run && !results.length && <EmptyState title="No profiles match" message="Lower a threshold, try another competition, or switch between league, keyword and OpenLigaDB sources." />}

      {!loading && !error && run && results.length > 0 && <>
        <p className="result-summary"><strong>{results.length}</strong> matches from {coverage.analyzed} analysed · {resultSummary(run, coverage)}.</p>
        <div className="card-grid scouting-grid">
          {results.map(player => {
            const club = getClubFromAssignments(player.clubAssignments)
            const playerStats = stats[player.id]
            const isMarketProfile = player.provider !== 'openligadb'
            const opportunity = isMarketProfile ? getContractOpportunity(player, Number(filters.contractMonths || 18)) : null
            return <article className={`card scout-card ${isMarketProfile ? '' : 'external-provider-card'}`} key={player.id} onClick={isMarketProfile ? () => navigate(`/players/${player.id}`) : undefined}>
              <div className="scout-card-top"><img src={player.portraitUrl} alt="" onError={getImageFallback} /><div><h2>{player.name}</h2><p>{getPositionName(player.attributes?.position) || 'Position unavailable'}</p><small>{getClubName(club) || 'Club unavailable'}</small></div></div>
              <div className="scout-metrics scouting-metrics-wide">{[['Apps', playerStats?.appearances], ['Goals', playerStats?.goals], ['Assists', playerStats?.assists], ['Minutes', playerStats?.minutes]].map(([label, value]) => <span key={label}>{label}<strong>{value ?? '-'}</strong></span>)}</div>
              {isMarketProfile ? <><div className="card-actions"><strong className="card-price">{formatMarketValue(player.marketValueDetails?.current?.value)}</strong><span className={`opportunity-badge ${opportunity.type}`}>{opportunity.label}</span></div><WatchlistButton player={player} compact /></> : <div className="api-football-actions"><span className="provider-badge">OpenLigaDB</span><button className="secondary-button" type="button" onClick={() => navigate(`/players?q=${encodeURIComponent(player.name)}`)}>Find market profile</button></div>}
            </article>
          })}
        </div>
      </>}
    </div>
  )
}

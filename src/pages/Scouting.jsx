import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getPlayers, getPlayerStatsByCompetition, search } from '../api/client'
import { chunk, formatMarketValue, getClubFromAssignments, getClubName, getContractOpportunity, getImageFallback, getPositionName, isAbortError, mapWithConcurrency, summarizePerformances } from '../api/utils'
import WatchlistButton from '../components/WatchlistButton'
import { CardSkeletonGrid, EmptyState, ErrorState } from '../components/StateMessage'

const MAX_PROFILES = 40
const initialFilters = { position: '', minAge: '', maxAge: '', maxValue: '', minGoals: '', minAssists: '', contractMonths: '', freeAgentsOnly: false, sort: 'value-desc' }

export default function Scouting() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const q = searchParams.get('q')?.trim() || ''
  const [query, setQuery] = useState(q)
  const [players, setPlayers] = useState([])
  const [stats, setStats] = useState({})
  const [filters, setFilters] = useState(initialFilters)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => setQuery(q), [q])

  useEffect(() => {
    if (!q) {
      setPlayers([])
      setStats({})
      return undefined
    }
    const controller = new AbortController()
    setLoading(true)
    setError(null)

    async function runSearch() {
      try {
        const result = await search(q, { signal: controller.signal, bypassCache: retryKey > 0 })
        const ids = (result.playerIds || []).slice(0, MAX_PROFILES)
        const batches = chunk(ids, 20)
        const profileGroups = await mapWithConcurrency(batches, 2, batch => getPlayers(batch, { signal: controller.signal, bypassCache: retryKey > 0 }), controller.signal)
        const profiles = profileGroups.flat().filter(Boolean)
        setPlayers(profiles)

        const entries = await mapWithConcurrency(profiles, 4, async player => {
          try {
            const data = await getPlayerStatsByCompetition(player.id, { signal: controller.signal, bypassCache: retryKey > 0 })
            return [String(player.id), summarizePerformances(data)]
          } catch (statsError) {
            if (isAbortError(statsError)) throw statsError
            return [String(player.id), null]
          }
        }, controller.signal)
        if (!controller.signal.aborted) setStats(Object.fromEntries(entries))
      } catch (loadError) {
        if (!isAbortError(loadError)) setError(loadError.message)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    runSearch()
    return () => controller.abort()
  }, [q, retryKey])

  const positions = useMemo(() => [...new Set(players.map(player => getPositionName(player.attributes?.position)).filter(Boolean))].sort(), [players])

  const results = useMemo(() => players.filter(player => {
    const playerStats = stats[player.id]
    const opportunity = getContractOpportunity(player, Number(filters.contractMonths || 18))
    const age = player.lifeDates?.age
    const value = Number(player.marketValueDetails?.current?.value || 0)
    if (filters.position && getPositionName(player.attributes?.position) !== filters.position) return false
    if (filters.minAge && (age == null || age < Number(filters.minAge))) return false
    if (filters.maxAge && (age == null || age > Number(filters.maxAge))) return false
    if (filters.maxValue && value > Number(filters.maxValue) * 1_000_000) return false
    if (filters.minGoals && (!playerStats || playerStats.goals < Number(filters.minGoals))) return false
    if (filters.minAssists && (!playerStats || playerStats.assists < Number(filters.minAssists))) return false
    if (filters.contractMonths && !['free-agent', 'expired', 'expiring'].includes(opportunity.type)) return false
    if (filters.freeAgentsOnly && opportunity.type !== 'free-agent') return false
    return true
  }).sort((a, b) => {
    const aStats = stats[a.id] || {}
    const bStats = stats[b.id] || {}
    if (filters.sort === 'age-asc') return Number(a.lifeDates?.age ?? 99) - Number(b.lifeDates?.age ?? 99)
    if (filters.sort === 'goals-desc') return Number(bStats.goals || 0) - Number(aStats.goals || 0)
    if (filters.sort === 'assists-desc') return Number(bStats.assists || 0) - Number(aStats.assists || 0)
    if (filters.sort === 'value-asc') return Number(a.marketValueDetails?.current?.value || 0) - Number(b.marketValueDetails?.current?.value || 0)
    return Number(b.marketValueDetails?.current?.value || 0) - Number(a.marketValueDetails?.current?.value || 0)
  }), [players, stats, filters])

  function submit(event) {
    event.preventDefault()
    if (query.trim()) setSearchParams({ q: query.trim() })
  }

  function setFilter(key, value) {
    setFilters(current => ({ ...current, [key]: value }))
  }

  return (
    <div>
      <div className="page-heading">
        <div><span className="eyebrow">Recruitment workspace</span><h1>Advanced scouting</h1></div>
        <form className="search-box compact" onSubmit={submit}><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Player, club or league keyword…" aria-label="Scouting keyword" /><button>Scout</button></form>
      </div>
      <p className="result-summary">The provider requires a keyword. Football DB analyzes up to {MAX_PROFILES} exposed profiles and adds performance and contract filters.</p>

      {q && (
        <section className="filter-panel">
          <div className="filter-grid scouting-filter-grid">
            <label>Position<select value={filters.position} onChange={event => setFilter('position', event.target.value)}><option value="">All positions</option>{positions.map(position => <option key={position}>{position}</option>)}</select></label>
            <label>Minimum age<input type="number" min="15" max="50" value={filters.minAge} onChange={event => setFilter('minAge', event.target.value)} /></label>
            <label>Maximum age<input type="number" min="15" max="50" value={filters.maxAge} onChange={event => setFilter('maxAge', event.target.value)} /></label>
            <label>Maximum value (€m)<input type="number" min="0" value={filters.maxValue} onChange={event => setFilter('maxValue', event.target.value)} /></label>
            <label>Minimum goals<input type="number" min="0" value={filters.minGoals} onChange={event => setFilter('minGoals', event.target.value)} /></label>
            <label>Minimum assists<input type="number" min="0" value={filters.minAssists} onChange={event => setFilter('minAssists', event.target.value)} /></label>
            <label>Contract expires within<select value={filters.contractMonths} onChange={event => setFilter('contractMonths', event.target.value)}><option value="">Any contract</option><option value="6">6 months</option><option value="12">12 months</option><option value="18">18 months</option><option value="24">24 months</option></select></label>
            <label>Sort results<select value={filters.sort} onChange={event => setFilter('sort', event.target.value)}><option value="value-desc">Highest value</option><option value="value-asc">Lowest value</option><option value="age-asc">Youngest</option><option value="goals-desc">Most goals</option><option value="assists-desc">Most assists</option></select></label>
          </div>
          <label className="advanced-toggle"><input type="checkbox" checked={filters.freeAgentsOnly} onChange={event => setFilter('freeAgentsOnly', event.target.checked)} /> Free agents only</label>
          <button className="text-link reset-button" type="button" onClick={() => setFilters(initialFilters)}>Reset filters</button>
        </section>
      )}

      {error && <ErrorState message={error} onRetry={() => setRetryKey(value => value + 1)} />}
      {loading && <CardSkeletonGrid count={6} />}
      {!q && <EmptyState title="Start with a scouting keyword" message="Examples: winger, Morocco, Raja Casablanca, Premier League or a player surname." />}
      {!loading && !error && q && results.length === 0 && <EmptyState title="No profiles match this scouting brief" message="Broaden the keyword or relax one of the filters." />}

      {!loading && !error && results.length > 0 && (
        <>
          <p className="result-summary"><strong>{results.length}</strong> matching profiles from {players.length} analyzed.</p>
          <div className="card-grid scouting-grid">
            {results.map(player => {
              const club = getClubFromAssignments(player.clubAssignments)
              const playerStats = stats[player.id]
              const opportunity = getContractOpportunity(player, Number(filters.contractMonths || 18))
              return (
                <article className="card scout-card" key={player.id} onClick={() => navigate(`/players/${player.id}`)}>
                  <div className="scout-card-top">
                    <img src={player.portraitUrl} alt="" onError={getImageFallback} />
                    <div><h2>{player.name}</h2><p>{getPositionName(player.attributes?.position) || 'Position unavailable'}</p><small>{getClubName(club) || 'Free agent'}</small></div>
                  </div>
                  <div className="scout-metrics"><span>Age<strong>{player.lifeDates?.age ?? '-'}</strong></span><span>Goals<strong>{playerStats?.goals ?? '-'}</strong></span><span>Assists<strong>{playerStats?.assists ?? '-'}</strong></span></div>
                  <div className="card-actions"><strong className="card-price">{formatMarketValue(player.marketValueDetails?.current?.value)}</strong><span className={`opportunity-badge ${opportunity.type}`}>{opportunity.label}</span></div>
                  <WatchlistButton player={player} compact />
                </article>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

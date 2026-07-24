import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getPlayers, getPlayerStatsByCompetition, search } from '../api/client'
import {
  formatMarketValue,
  getClubFromAssignments,
  getClubName,
  getImageFallback,
  getPositionName,
  isAbortError,
  mapWithConcurrency,
  parsePositiveInt
} from '../api/utils'
import Pagination from '../components/Pagination'
import { CardSkeletonGrid, EmptyState, ErrorState } from '../components/StateMessage'

const PAGE_SIZE = 20

export default function PlayerSearch() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const q = searchParams.get('q')?.trim() || ''
  const requestedPage = parsePositiveInt(searchParams.get('page'), 1)

  const [query, setQuery] = useState(q)
  const [players, setPlayers] = useState([])
  const [availableIds, setAvailableIds] = useState([])
  const [reportedTotal, setReportedTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [retryKey, setRetryKey] = useState(0)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [playerStats, setPlayerStats] = useState({})
  const [loadingStats, setLoadingStats] = useState(false)
  const [filters, setFilters] = useState({
    name: '', position: '', minAge: '', maxAge: '', minValue: '', maxValue: '',
    minGoals: '', minAssists: '', clubName: ''
  })

  useEffect(() => setQuery(q), [q])

  const pageCount = Math.max(1, Math.ceil(availableIds.length / PAGE_SIZE))
  const page = Math.min(requestedPage, pageCount)

  useEffect(() => {
    if (!q) {
      setPlayers([])
      setAvailableIds([])
      setReportedTotal(0)
      return undefined
    }

    const controller = new AbortController()

    async function loadPlayers() {
      setLoading(true)
      setError(null)
      setPlayerStats({})
      try {
        const result = await search(q, { signal: controller.signal, bypassCache: retryKey > 0 })
        const ids = result.playerIds || []
        const nextPageCount = Math.max(1, Math.ceil(ids.length / PAGE_SIZE))
        const safePage = Math.min(requestedPage, nextPageCount)
        const start = (safePage - 1) * PAGE_SIZE
        const pageIds = ids.slice(start, start + PAGE_SIZE)
        const profiles = pageIds.length
          ? await getPlayers(pageIds, { signal: controller.signal, bypassCache: retryKey > 0 })
          : []

        setAvailableIds(ids)
        setReportedTotal(result.totalCount?.players || ids.length)
        setPlayers(Array.isArray(profiles) ? profiles : [])

        if (safePage !== requestedPage) {
          setSearchParams({ q, page: String(safePage) }, { replace: true })
        }
      } catch (loadError) {
        if (!isAbortError(loadError)) setError(loadError.message)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    loadPlayers()
    return () => controller.abort()
  }, [q, requestedPage, retryKey, setSearchParams])

  useEffect(() => {
    if (!showAdvanced || players.length === 0) {
      setLoadingStats(false)
      return undefined
    }

    const controller = new AbortController()
    setLoadingStats(true)

    mapWithConcurrency(
      players,
      4,
      async player => {
        try {
          const data = await getPlayerStatsByCompetition(player.id, { signal: controller.signal })
          const performances = data?.performances || []
          const totals = performances.reduce((accumulator, performance) => ({
            goals: accumulator.goals + Number(performance.goalsScored || 0),
            assists: accumulator.assists + Number(performance.assists || 0)
          }), { goals: 0, assists: 0 })
          return [player.id, totals]
        } catch (statsError) {
          if (isAbortError(statsError)) throw statsError
          return [player.id, null]
        }
      },
      controller.signal
    ).then(entries => {
      if (!controller.signal.aborted) setPlayerStats(Object.fromEntries(entries))
    }).catch(statsError => {
      if (!isAbortError(statsError)) console.error('Player statistics failed', statsError)
    }).finally(() => {
      if (!controller.signal.aborted) setLoadingStats(false)
    })

    return () => controller.abort()
  }, [showAdvanced, players])

  const positions = useMemo(() => {
    return [...new Set(players.map(player => getPositionName(player.attributes?.position)).filter(Boolean))].sort()
  }, [players])

  const filteredPlayers = useMemo(() => players.filter(player => {
    const playerName = String(player.name || '').toLowerCase()
    const club = getClubFromAssignments(player.clubAssignments)
    const clubName = getClubName(club).toLowerCase()
    const position = getPositionName(player.attributes?.position)
    const age = player.lifeDates?.age
    const marketValue = player.marketValueDetails?.current?.value
    const stats = playerStats[player.id]

    if (filters.name && !playerName.includes(filters.name.toLowerCase())) return false
    if (filters.clubName && !clubName.includes(filters.clubName.toLowerCase())) return false
    if (filters.position && position !== filters.position) return false
    if (filters.minAge && (age == null || age < Number(filters.minAge))) return false
    if (filters.maxAge && (age == null || age > Number(filters.maxAge))) return false
    if (filters.minValue && (marketValue == null || marketValue < Number(filters.minValue) * 1_000_000)) return false
    if (filters.maxValue && (marketValue == null || marketValue > Number(filters.maxValue) * 1_000_000)) return false
    if (showAdvanced && filters.minGoals && (!stats || stats.goals < Number(filters.minGoals))) return false
    if (showAdvanced && filters.minAssists && (!stats || stats.assists < Number(filters.minAssists))) return false
    return true
  }), [players, filters, showAdvanced, playerStats])

  const setFilter = useCallback((key, value) => {
    setFilters(previous => ({ ...previous, [key]: value }))
  }, [])

  function handleSearch(event) {
    event.preventDefault()
    const value = query.trim()
    if (!value) return
    setSearchParams({ q: value, page: '1' })
  }

  function handlePageChange(nextPage) {
    const next = new URLSearchParams(searchParams)
    next.set('page', String(nextPage))
    setSearchParams(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!q) {
    return (
      <section className="search-section">
        <span className="eyebrow">Player database</span>
        <h1>Search players</h1>
        <p>Find profiles, market values, transfers and career statistics.</p>
        <form className="search-box" onSubmit={handleSearch}>
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Player name…" aria-label="Player name" />
          <button type="submit">Search</button>
        </form>
      </section>
    )
  }

  return (
    <div>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Player database</span>
          <h1>Player results</h1>
        </div>
        <form className="search-box compact" onSubmit={handleSearch}>
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Player name…" aria-label="Player name" />
          <button type="submit">Search</button>
        </form>
      </div>

      <p className="result-summary">
        Results for <strong>“{q}”</strong> · {reportedTotal} reported
        {availableIds.length < reportedTotal && ` · ${availableIds.length} profiles available from the provider`}
      </p>

      {error && <ErrorState message={error} onRetry={() => setRetryKey(key => key + 1)} />}
      {loading && <CardSkeletonGrid />}

      {!loading && !error && players.length > 0 && (
        <>
          <section className="filter-panel">
            <div className="filter-grid">
              <label>Name<input value={filters.name} onChange={event => setFilter('name', event.target.value)} placeholder="Filter name" /></label>
              <label>Club<input value={filters.clubName} onChange={event => setFilter('clubName', event.target.value)} placeholder="Filter club" /></label>
              <label>Position<select value={filters.position} onChange={event => setFilter('position', event.target.value)}><option value="">All positions</option>{positions.map(position => <option key={position}>{position}</option>)}</select></label>
              <label>Minimum age<input type="number" min="0" max="50" value={filters.minAge} onChange={event => setFilter('minAge', event.target.value)} /></label>
              <label>Maximum age<input type="number" min="0" max="50" value={filters.maxAge} onChange={event => setFilter('maxAge', event.target.value)} /></label>
              <label>Minimum value (€m)<input type="number" min="0" value={filters.minValue} onChange={event => setFilter('minValue', event.target.value)} /></label>
              <label>Maximum value (€m)<input type="number" min="0" value={filters.maxValue} onChange={event => setFilter('maxValue', event.target.value)} /></label>
            </div>

            <label className="advanced-toggle">
              <input type="checkbox" checked={showAdvanced} onChange={event => setShowAdvanced(event.target.checked)} />
              Load advanced goals and assists
              {loadingStats && <span className="inline-loader">Loading statistics…</span>}
            </label>

            {showAdvanced && (
              <div className="advanced-filters">
                <label>Minimum goals<input type="number" min="0" value={filters.minGoals} onChange={event => setFilter('minGoals', event.target.value)} /></label>
                <label>Minimum assists<input type="number" min="0" value={filters.minAssists} onChange={event => setFilter('minAssists', event.target.value)} /></label>
              </div>
            )}
            <p className="filter-note">Filters apply to the profiles on this page.</p>
          </section>

          {filteredPlayers.length > 0 ? (
            <div className="card-grid">
              {filteredPlayers.map(player => {
                const club = getClubFromAssignments(player.clubAssignments)
                const stats = playerStats[player.id]
                return (
                  <article key={player.id} className="card result-card" onClick={() => navigate(`/players/${player.id}`)}>
                    <img src={player.portraitUrl} alt="" onError={getImageFallback} />
                    <div className="card-content">
                      <h2>{player.name}</h2>
                      <p>{getPositionName(player.attributes?.position) || 'Position unavailable'}</p>
                      <div className="card-meta">
                        {player.lifeDates?.age != null && <span>{player.lifeDates.age} years</span>}
                        {getClubName(club) && <span>{getClubName(club)}</span>}
                      </div>
                      {showAdvanced && stats && <div className="performance-badge">{stats.goals} goals · {stats.assists} assists</div>}
                      <strong className="card-price">{formatMarketValue(player.marketValueDetails?.current?.value)}</strong>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <EmptyState title="No players match these filters" message="Clear one or more filters to see the current page results." />
          )}

          <Pagination page={page} pageCount={pageCount} onPageChange={handlePageChange} />
        </>
      )}

      {!loading && !error && players.length === 0 && (
        <EmptyState title="No players found" message="Try another spelling or a more complete player name." />
      )}
    </div>
  )
}

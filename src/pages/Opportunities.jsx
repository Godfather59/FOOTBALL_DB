import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getPlayers, search } from '../api/client'
import { chunk, formatDate, formatMarketValue, getClubFromAssignments, getClubName, getContractOpportunity, getImageFallback, getPositionName, isAbortError, mapWithConcurrency } from '../api/utils'
import WatchlistButton from '../components/WatchlistButton'
import { CardSkeletonGrid, EmptyState, ErrorState } from '../components/StateMessage'

const MAX_PROFILES = 60

export default function Opportunities() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const q = searchParams.get('q')?.trim() || ''
  const [query, setQuery] = useState(q)
  const [windowMonths, setWindowMonths] = useState(18)
  const [includeUnknown, setIncludeUnknown] = useState(false)
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => setQuery(q), [q])

  useEffect(() => {
    if (!q) {
      setPlayers([])
      return undefined
    }
    const controller = new AbortController()
    setLoading(true)
    setError(null)

    search(q, { signal: controller.signal, bypassCache: retryKey > 0 })
      .then(result => mapWithConcurrency(
        chunk((result.playerIds || []).slice(0, MAX_PROFILES), 20),
        2,
        ids => getPlayers(ids, { signal: controller.signal, bypassCache: retryKey > 0 }),
        controller.signal
      ))
      .then(groups => {
        if (!controller.signal.aborted) setPlayers(groups.flat().filter(Boolean))
      })
      .catch(loadError => {
        if (!isAbortError(loadError)) setError(loadError.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [q, retryKey])

  const opportunities = useMemo(() => players
    .map(player => ({ player, opportunity: getContractOpportunity(player, windowMonths) }))
    .filter(({ opportunity }) => ['free-agent', 'expired', 'expiring'].includes(opportunity.type) || (includeUnknown && opportunity.type === 'unknown'))
    .sort((a, b) => {
      const rank = { 'free-agent': 0, expired: 1, expiring: 2, unknown: 3 }
      if (rank[a.opportunity.type] !== rank[b.opportunity.type]) return rank[a.opportunity.type] - rank[b.opportunity.type]
      return Number(a.opportunity.monthsRemaining ?? 999) - Number(b.opportunity.monthsRemaining ?? 999)
    }), [players, windowMonths, includeUnknown])

  function submit(event) {
    event.preventDefault()
    if (query.trim()) setSearchParams({ q: query.trim() })
  }

  return (
    <div>
      <div className="page-heading">
        <div><span className="eyebrow">Transfer opportunities</span><h1>Contracts and free agents</h1></div>
        <form className="search-box compact" onSubmit={submit}><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search a club, league or nationality…" aria-label="Opportunity search" /><button>Discover</button></form>
      </div>
      <p className="result-summary">Discovery is scoped to profiles exposed by the provider for your keyword. It does not claim to be a complete global free-agent list.</p>

      <section className="filter-panel opportunity-controls">
        <label>Expiry window<select value={windowMonths} onChange={event => setWindowMonths(Number(event.target.value))}><option value="6">Next 6 months</option><option value="12">Next 12 months</option><option value="18">Next 18 months</option><option value="24">Next 24 months</option></select></label>
        <label className="advanced-toggle"><input type="checkbox" checked={includeUnknown} onChange={event => setIncludeUnknown(event.target.checked)} /> Include unknown contracts</label>
      </section>

      {error && <ErrorState message={error} onRetry={() => setRetryKey(value => value + 1)} />}
      {loading && <CardSkeletonGrid count={6} />}
      {!q && <EmptyState title="Search for market opportunities" message="Try a league, club, country or position keyword to inspect exposed free agents and expiring contracts." />}
      {!loading && !error && q && opportunities.length === 0 && <EmptyState title="No contract opportunities found" message={`No exposed profile matched the selected ${windowMonths}-month window.`} />}

      {!loading && !error && opportunities.length > 0 && (
        <div className="opportunity-list">
          {opportunities.map(({ player, opportunity }) => {
            const club = getClubFromAssignments(player.clubAssignments)
            return (
              <article className="opportunity-row" key={player.id}>
                <button className="opportunity-profile" type="button" onClick={() => navigate(`/players/${player.id}`)}>
                  <img src={player.portraitUrl} alt="" onError={getImageFallback} />
                  <span><strong>{player.name}</strong><small>{getPositionName(player.attributes?.position) || 'Position unavailable'} · {getClubName(club) || 'No active club'}</small></span>
                </button>
                <div className="opportunity-value"><span>Market value</span><strong>{formatMarketValue(player.marketValueDetails?.current?.value)}</strong></div>
                <div className="opportunity-contract"><span className={`opportunity-badge ${opportunity.type}`}>{opportunity.label}</span><small>{opportunity.contractEndDate ? formatDate(opportunity.contractEndDate) : 'No confirmed end date'}</small></div>
                <WatchlistButton player={player} compact />
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

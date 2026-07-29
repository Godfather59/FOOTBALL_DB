import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getPlayers, getPlayerStatsByCompetition } from '../api/client'
import { formatDate, formatMarketValue, getClubFromAssignments, getClubName, getContractEndDate, getImageFallback, getPositionName, isAbortError, mapWithConcurrency, summarizePerformances } from '../api/utils'
import { EmptyState, ErrorState, LoadingState } from '../components/StateMessage'
import { useWatchlist } from '../context/WatchlistContext'

export default function PlayerCompare() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { items } = useWatchlist()
  const rawIds = searchParams.get('ids') || ''
  const ids = useMemo(() => [...new Set(rawIds.split(',').map(value => value.trim()).filter(Boolean))].slice(0, 4), [rawIds])
  const [players, setPlayers] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    if (ids.length === 0) {
      setPlayers([])
      setStats({})
      return undefined
    }
    const controller = new AbortController()
    setLoading(true)
    setError(null)

    getPlayers(ids, { signal: controller.signal, bypassCache: retryKey > 0 })
      .then(async profiles => {
        const ordered = ids.map(id => profiles.find(player => String(player.id) === id)).filter(Boolean)
        setPlayers(ordered)
        const entries = await mapWithConcurrency(ordered, 3, async player => {
          try {
            const result = await getPlayerStatsByCompetition(player.id, { signal: controller.signal, bypassCache: retryKey > 0 })
            return [String(player.id), summarizePerformances(result)]
          } catch (statsError) {
            if (isAbortError(statsError)) throw statsError
            return [String(player.id), null]
          }
        }, controller.signal)
        if (!controller.signal.aborted) setStats(Object.fromEntries(entries))
      })
      .catch(loadError => {
        if (!isAbortError(loadError)) setError(loadError.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [rawIds, retryKey])

  function toggleId(id) {
    const stringId = String(id)
    const next = ids.includes(stringId)
      ? ids.filter(value => value !== stringId)
      : ids.length < 4 ? [...ids, stringId] : ids
    setSearchParams(next.length ? { ids: next.join(',') } : {})
  }

  const rows = [
    ['Position', player => getPositionName(player.attributes?.position) || 'N/A'],
    ['Club', player => getClubName(getClubFromAssignments(player.clubAssignments)) || 'Free agent'],
    ['Age', player => player.lifeDates?.age ?? 'N/A'],
    ['Height', player => player.attributes?.height ? `${player.attributes.height} m` : 'N/A'],
    ['Preferred foot', player => player.attributes?.preferredFoot?.name || 'N/A'],
    ['Market value', player => formatMarketValue(player.marketValueDetails?.current?.value)],
    ['Contract end', player => formatDate(getContractEndDate(getClubFromAssignments(player.clubAssignments)))],
    ['Appearances', player => stats[player.id]?.appearances ?? 'N/A'],
    ['Goals', player => stats[player.id]?.goals ?? 'N/A'],
    ['Assists', player => stats[player.id]?.assists ?? 'N/A'],
    ['Goal contributions', player => stats[player.id] ? stats[player.id].goals + stats[player.id].assists : 'N/A']
  ]

  return (
    <div>
      <div className="page-heading"><div><span className="eyebrow">Side-by-side analysis</span><h1>Player comparison</h1></div></div>

      <section className="section compare-picker">
        <div><h2>Choose 2–4 saved players</h2><p>Selections are reflected in the URL, so the comparison can be bookmarked or shared.</p></div>
        {items.length > 0 ? (
          <div className="compare-options">
            {items.map(item => (
              <label key={item.id} className={ids.includes(item.id) ? 'selected' : ''}>
                <input type="checkbox" checked={ids.includes(item.id)} disabled={!ids.includes(item.id) && ids.length >= 4} onChange={() => toggleId(item.id)} />
                <span>{item.name}</span>
              </label>
            ))}
          </div>
        ) : <p className="muted">Your watchlist is empty. Save players first, then choose them here.</p>}
      </section>

      {error && <ErrorState message={error} onRetry={() => setRetryKey(value => value + 1)} />}
      {loading && <LoadingState label="Building comparison…" />}
      {!loading && !error && ids.length < 2 && <EmptyState title="Select at least two players" message="Open the watchlist or save players from search results to begin comparing." />}

      {!loading && !error && players.length >= 2 && (
        <>
          <div className="compare-player-grid">
            {players.map(player => (
              <article className="compare-player-card" key={player.id}>
                <img src={player.portraitUrl} alt="" onError={getImageFallback} />
                <h2>{player.name}</h2>
                <p>{getPositionName(player.attributes?.position) || 'Position unavailable'}</p>
                <button type="button" className="text-link" onClick={() => navigate(`/players/${player.id}`)}>Open profile</button>
              </article>
            ))}
          </div>
          <section className="section">
            <h2>Comparison table</h2>
            <div className="table-scroll">
              <table className="table comparison-table">
                <thead><tr><th>Metric</th>{players.map(player => <th key={player.id}>{player.name}</th>)}</tr></thead>
                <tbody>{rows.map(([label, getter]) => <tr key={label}><td><strong>{label}</strong></td>{players.map(player => <td key={player.id}>{getter(player)}</td>)}</tr>)}</tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}

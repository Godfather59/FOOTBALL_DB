import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { getPlayer, getPlayers, getPlayerStatsByCompetition, search } from '../api/client'
import { calculateSimilarity, clubNameFromPlayer } from '../api/recruitment'
import { formatMarketValue, getImageFallback, getPositionName, isAbortError, mapWithConcurrency, summarizePerformances } from '../api/utils'
import { EmptyState, ErrorState, LoadingState } from '../components/StateMessage'
import WatchlistButton from '../components/WatchlistButton'

export default function SimilarPlayers() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q') || ''
  const [source, setSource] = useState(null)
  const [sourceStats, setSourceStats] = useState({})
  const [candidates, setCandidates] = useState([])
  const [candidateStats, setCandidateStats] = useState({})
  const [query, setQuery] = useState(q)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [weights, setWeights] = useState({ position: 30, age: 20, value: 20, output: 20, height: 5, foot: 5 })

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError(null)
    Promise.all([getPlayer(id, { signal: controller.signal }), getPlayerStatsByCompetition(id, { signal: controller.signal }).catch(() => null)])
      .then(([player, stats]) => { setSource(player); setSourceStats(summarizePerformances(stats)); if (!q) { const suggestion = getPositionName(player?.attributes?.position) || clubNameFromPlayer(player); setQuery(suggestion) } })
      .catch(loadError => { if (!isAbortError(loadError)) setError(loadError.message) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [id, q])

  useEffect(() => {
    if (!q) { setCandidates([]); return undefined }
    const controller = new AbortController()
    setLoading(true); setError(null)
    async function loadCandidates() {
      try {
        const result = await search(q, { signal: controller.signal })
        const ids = (result.playerIds || []).filter(playerId => String(playerId) !== String(id)).slice(0, 40)
        const profiles = await getPlayers(ids, { signal: controller.signal })
        setCandidates(Array.isArray(profiles) ? profiles : [])
        const entries = await mapWithConcurrency(profiles || [], 4, async player => {
          try { return [String(player.id), summarizePerformances(await getPlayerStatsByCompetition(player.id, { signal: controller.signal }))] } catch (statsError) { if (isAbortError(statsError)) throw statsError; return [String(player.id), {}] }
        }, controller.signal)
        setCandidateStats(Object.fromEntries(entries))
      } catch (loadError) { if (!isAbortError(loadError)) setError(loadError.message) }
      finally { if (!controller.signal.aborted) setLoading(false) }
    }
    loadCandidates(); return () => controller.abort()
  }, [q, id])

  const ranked = useMemo(() => candidates.map(player => ({ player, score: calculateSimilarity(source, player, sourceStats, candidateStats[String(player.id)] || {}, weights) })).sort((a, b) => b.score - a.score), [candidates, source, sourceStats, candidateStats, weights])

  function submit(event) { event.preventDefault(); const value = query.trim(); if (value) setSearchParams({ q: value }) }
  function setWeight(key, value) { setWeights(current => ({ ...current, [key]: Number(value) })) }

  if (loading && !source) return <LoadingState label="Loading similarity model…" />
  if (error && !source) return <ErrorState message={error} />
  if (!source) return <EmptyState title="Player unavailable" />

  return <div>
    <div className="page-heading"><div><span className="eyebrow">Replacement finder</span><h1>Players similar to {source.name}</h1></div><button className="secondary-button" onClick={() => navigate(`/players/${source.id}`)}>Back to profile</button></div>
    <section className="profile-header compact-profile"><img src={source.portraitUrl} alt={source.name} onError={getImageFallback} /><div><h2>{source.name}</h2><p>{getPositionName(source.attributes?.position)} · {clubNameFromPlayer(source) || 'No club'} · {formatMarketValue(source.marketValueDetails?.current?.value)}</p><strong>{sourceStats.goals || 0} goals · {sourceStats.assists || 0} assists</strong></div></section>
    <section className="filter-panel"><form className="search-box" onSubmit={submit}><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Candidate pool: league, club, nationality or position" /><button>Find alternatives</button></form><p className="filter-note">The keyword defines the candidate pool. The model scores position, age, market value, output, height and preferred foot.</p><div className="preset-buttons"><button type="button" className="mini-button" onClick={() => setWeights({ position: 35, age: 25, value: 25, output: 5, height: 5, foot: 5 })}>Cheaper replacement</button><button type="button" className="mini-button" onClick={() => setWeights({ position: 35, age: 35, value: 10, output: 10, height: 5, foot: 5 })}>Younger replacement</button><button type="button" className="mini-button" onClick={() => setWeights({ position: 25, age: 10, value: 10, output: 45, height: 5, foot: 5 })}>Performance match</button></div><div className="weight-grid">{Object.entries(weights).map(([key, value]) => <label key={key}>{key}<input type="range" min="0" max="50" value={value} onChange={event => setWeight(key, event.target.value)} /><span>{value}</span></label>)}</div></section>
    {loading && <LoadingState label="Scoring candidate profiles…" />}{error && <ErrorState message={error} />}
    {!loading && q && ranked.length === 0 && <EmptyState title="No comparable players exposed" message="Try a league, club, nationality or broader football keyword." />}
    <div className="similar-grid">{ranked.slice(0, 20).map(({ player, score }, index) => { const stats = candidateStats[String(player.id)] || {}; return <article key={player.id} className="similar-card"><div className="similar-rank">#{index + 1}</div><div className="similar-score">{score}%<small>match</small></div><button className="watchlist-profile" onClick={() => navigate(`/players/${player.id}`)}><img src={player.portraitUrl} alt="" onError={getImageFallback} /><span><strong>{player.name}</strong><small>{getPositionName(player.attributes?.position)} · {player.lifeDates?.age ?? 'Age N/A'}</small><small>{clubNameFromPlayer(player) || 'Free agent'} · {formatMarketValue(player.marketValueDetails?.current?.value)}</small></span></button><div className="scout-metrics"><span><strong>{stats.goals || 0}</strong>Goals</span><span><strong>{stats.assists || 0}</strong>Assists</span><span><strong>{(stats.goals || 0) + (stats.assists || 0)}</strong>G+A</span></div><div className="card-actions"><WatchlistButton player={player} compact /><button className="mini-button" onClick={() => navigate(`/compare?ids=${source.id},${player.id}`)}>Compare</button></div></article> })}</div>
  </div>
}

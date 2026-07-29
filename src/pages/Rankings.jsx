import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getPlayerMarketValue, getPlayers, getPlayerStatsByCompetition, search } from '../api/client'
import { clubNameFromPlayer, marketTrend, rankScore } from '../api/recruitment'
import { formatMarketValue, getContractOpportunity, getImageFallback, getPositionName, isAbortError, mapWithConcurrency, summarizePerformances } from '../api/utils'
import { EmptyState, ErrorState, LoadingState } from '../components/StateMessage'
import WatchlistButton from '../components/WatchlistButton'

const CATEGORIES = [
  ['young', 'Best young players'], ['free-agents', 'Best free agents'], ['value-for-money', 'Best value for money'],
  ['contributions', 'Highest goal contributions'], ['value', 'Most valuable players'], ['contracts', 'Contracts ending soon'],
  ['risers', 'Biggest value risers'], ['fallers', 'Biggest value fallers']
]

export default function Rankings() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q') || ''
  const category = searchParams.get('category') || 'young'
  const [query, setQuery] = useState(q)
  const [dataset, setDataset] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({ position: '', maxAge: '', maxValue: '' })

  useEffect(() => setQuery(q), [q])
  useEffect(() => {
    if (!q) { setDataset([]); return undefined }
    const controller = new AbortController(); setLoading(true); setError(null)
    async function loadRanking() {
      try {
        const result = await search(q, { signal: controller.signal })
        const ids = (result.playerIds || []).slice(0, 50)
        const players = await getPlayers(ids, { signal: controller.signal })
        const enriched = await mapWithConcurrency(players || [], 4, async player => {
          let stats = {}; let trend = { change: 0, direction: 'flat' }
          try { stats = summarizePerformances(await getPlayerStatsByCompetition(player.id, { signal: controller.signal })) } catch (statsError) { if (isAbortError(statsError)) throw statsError }
          if (category === 'risers' || category === 'fallers') {
            try { trend = marketTrend(await getPlayerMarketValue(player.id, { signal: controller.signal })) } catch (historyError) { if (isAbortError(historyError)) throw historyError }
          }
          return { player, stats, trend }
        }, controller.signal)
        setDataset(enriched)
      } catch (loadError) { if (!isAbortError(loadError)) setError(loadError.message) }
      finally { if (!controller.signal.aborted) setLoading(false) }
    }
    loadRanking(); return () => controller.abort()
  }, [q, category])

  const positions = useMemo(() => [...new Set(dataset.map(item => getPositionName(item.player.attributes?.position)).filter(Boolean))].sort(), [dataset])
  const ranked = useMemo(() => dataset.filter(item => {
    const player = item.player
    const age = Number(player.lifeDates?.age)
    const value = Number(player.marketValueDetails?.current?.value || 0)
    if (filters.position && getPositionName(player.attributes?.position) !== filters.position) return false
    if (filters.maxAge && (!Number.isFinite(age) || age > Number(filters.maxAge))) return false
    if (filters.maxValue && value > Number(filters.maxValue) * 1_000_000) return false
    return Number.isFinite(rankScore(item, category))
  }).sort((a, b) => rankScore(b, category) - rankScore(a, category)), [dataset, filters, category])

  function submit(event) { event.preventDefault(); const value = query.trim(); if (value) setSearchParams({ q: value, category }) }
  function changeCategory(next) { const params = new URLSearchParams(searchParams); params.set('category', next); if (q) params.set('q', q); setSearchParams(params) }

  return <div>
    <div className="page-heading"><div><span className="eyebrow">Discovery lists</span><h1>Player rankings</h1></div><form className="search-box compact" onSubmit={submit}><input value={query} onChange={event => setQuery(event.target.value)} placeholder="League, club, country or player pool" /><button>Rank</button></form></div>
    <p className="result-summary">Rank up to 50 profiles exposed by your keyword. Categories use returned market values, contracts, performance and value history.</p>
    <section className="ranking-tabs">{CATEGORIES.map(([value, label]) => <button key={value} className={category === value ? 'active' : ''} onClick={() => changeCategory(value)}>{label}</button>)}</section>
    {q && <section className="filter-panel"><div className="filter-grid"><label>Position<select value={filters.position} onChange={event => setFilters(current => ({ ...current, position: event.target.value }))}><option value="">All positions</option>{positions.map(position => <option key={position}>{position}</option>)}</select></label><label>Maximum age<input type="number" min="15" max="50" value={filters.maxAge} onChange={event => setFilters(current => ({ ...current, maxAge: event.target.value }))} /></label><label>Maximum value (€m)<input type="number" min="0" value={filters.maxValue} onChange={event => setFilters(current => ({ ...current, maxValue: event.target.value }))} /></label></div></section>}
    {loading && <LoadingState label="Building ranking…" />}{error && <ErrorState message={error} />}
    {!loading && q && ranked.length === 0 && !error && <EmptyState title="No qualifying players" message="Try a broader keyword or relax the ranking filters." />}
    <div className="ranking-list">{ranked.slice(0, 30).map((item, index) => <RankingRow key={item.player.id} item={item} index={index} category={category} navigate={navigate} />)}</div>
  </div>
}

function RankingRow({ item, index, category, navigate }) {
  const { player, stats, trend } = item
  const opportunity = getContractOpportunity(player, 18)
  let headline = formatMarketValue(player.marketValueDetails?.current?.value)
  if (category === 'contributions') headline = `${(stats.goals || 0) + (stats.assists || 0)} G+A`
  if (category === 'value-for-money') headline = `${rankScore(item, category).toFixed(2)} G+A/€m`
  if (category === 'young') headline = `${player.lifeDates?.age ?? 'N/A'} years`
  if (category === 'free-agents' || category === 'contracts') headline = opportunity.label
  if (category === 'risers' || category === 'fallers') headline = `${trend.change >= 0 ? '+' : ''}${formatMarketValue(trend.change)}`
  return <article className="ranking-row"><div className="ranking-number">{index + 1}</div><button className="ranking-player" onClick={() => navigate(`/players/${player.id}`)}><img src={player.portraitUrl} alt="" onError={getImageFallback} /><span><strong>{player.name}</strong><small>{getPositionName(player.attributes?.position)} · {clubNameFromPlayer(player) || 'Free agent'}</small></span></button><div className="ranking-output"><strong>{headline}</strong><small>{stats.goals || 0} goals · {stats.assists || 0} assists</small></div><WatchlistButton player={player} compact /></article>
}

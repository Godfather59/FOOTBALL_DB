import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getClub, getClubSquad, getPlayerInjuries, getPlayers, getPlayerStatsByCompetition, getPlayerTransfers, search } from '../api/client'
import { formatMarketValue, getContractOpportunity, getImageFallback, getPositionName, isAbortError, mapWithConcurrency, summarizePerformances } from '../api/utils'
import { EmptyState, ErrorState, LoadingState } from '../components/StateMessage'

function activeInjury(data) {
  const rows = Array.isArray(data) ? data : data?.injuries || []
  const now = Date.now()
  return rows.some(item => {
    const until = new Date(item.dateUntil || item.untilDate || item.endDate || 0).getTime()
    return Number.isFinite(until) && until >= now
  })
}

async function loadClubByQuery(query, signal) {
  if (!query) return null
  const result = await search(query, { signal })
  const id = result.clubIds?.[0]
  if (!id) throw new Error(`No club found for “${query}”`)
  const [club, squadData] = await Promise.all([getClub(id, { signal }), getClubSquad(id, { signal }).catch(() => null)])
  const squad = Array.isArray(squadData) ? squadData : squadData?.squad || squadData?.players || []
  const ids = [...new Set(squad.map(item => item.playerId || item.id).filter(Boolean))]
  const players = ids.length ? await getPlayers(ids, { signal }).catch(() => []) : []
  const clubName = club.name || ''
  const enrichment = await mapWithConcurrency((players || []).slice(0, 25), 4, async player => {
    const [statsData, injuriesData, transfersData] = await Promise.all([
      getPlayerStatsByCompetition(player.id, { signal }).catch(() => null),
      getPlayerInjuries(player.id, { signal }).catch(() => null),
      getPlayerTransfers(player.id, { signal }).catch(() => null)
    ])
    return { playerId: String(player.id), stats: summarizePerformances(statsData), injured: activeInjury(injuriesData), transfers: transfersData?.transfers || [] }
  }, signal)
  const analytics = enrichment.reduce((totals, item) => {
    totals.goals += item.stats.goals || 0
    totals.assists += item.stats.assists || 0
    if (item.injured) totals.injured += 1
    const player = (players || []).find(candidate => String(candidate.id) === item.playerId)
    if (player && ['free-agent', 'expired', 'expiring'].includes(getContractOpportunity(player, 18).type)) totals.expiring += 1
    item.transfers.forEach(transfer => {
      const fee = Number(transfer.transferFee || transfer.fee || 0)
      const from = String(transfer.fromClub?.name || '').toLowerCase()
      const to = String(transfer.toClub?.name || '').toLowerCase()
      const target = clubName.toLowerCase()
      if (target && to.includes(target)) totals.arrivalFees += fee
      if (target && from.includes(target)) totals.departureFees += fee
    })
    return totals
  }, { goals: 0, assists: 0, injured: 0, expiring: 0, arrivalFees: 0, departureFees: 0 })
  analytics.netSpend = analytics.arrivalFees - analytics.departureFees
  return { id, club, squad, players: Array.isArray(players) ? players : [], analytics }
}

function metricRows(left, right) {
  const l = left?.club?.squadDetails || {}
  const r = right?.club?.squadDetails || {}
  return [
    ['Squad value', formatMarketValue(l.totalMarketValue), formatMarketValue(r.totalMarketValue)],
    ['Squad size', l.squadSize ?? left?.squad.length ?? 'N/A', r.squadSize ?? right?.squad.length ?? 'N/A'],
    ['Average age', l.averageAge ?? 'N/A', r.averageAge ?? 'N/A'],
    ['Foreign players', l.foreignCount ?? 'N/A', r.foreignCount ?? 'N/A'],
    ['Internationals', l.nationalCount ?? 'N/A', r.nationalCount ?? 'N/A'],
    ['Returned-squad goals', left.analytics.goals, right.analytics.goals],
    ['Returned-squad assists', left.analytics.assists, right.analytics.assists],
    ['Currently injured', left.analytics.injured, right.analytics.injured],
    ['Expiring/free contracts', left.analytics.expiring, right.analytics.expiring],
    ['Recorded arrival fees', formatMarketValue(left.analytics.arrivalFees), formatMarketValue(right.analytics.arrivalFees)],
    ['Recorded departure fees', formatMarketValue(left.analytics.departureFees), formatMarketValue(right.analytics.departureFees)],
    ['Recorded net spend', formatMarketValue(left.analytics.netSpend), formatMarketValue(right.analytics.netSpend)],
    ['Most valuable player', formatMarketValue(Math.max(0, ...(left?.players || []).map(player => Number(player.marketValueDetails?.current?.value || 0)))), formatMarketValue(Math.max(0, ...(right?.players || []).map(player => Number(player.marketValueDetails?.current?.value || 0))))]
  ]
}

function depth(players) {
  const groups = { Goalkeepers: 0, Defenders: 0, Midfielders: 0, Forwards: 0 }
  players.forEach(player => {
    const position = getPositionName(player.attributes?.position).toLowerCase()
    if (position.includes('goal')) groups.Goalkeepers += 1
    else if (position.includes('back') || position.includes('defender')) groups.Defenders += 1
    else if (position.includes('midfield')) groups.Midfielders += 1
    else groups.Forwards += 1
  })
  return groups
}

export default function ClubCompare() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const leftQuery = searchParams.get('left') || ''
  const rightQuery = searchParams.get('right') || ''
  const [leftInput, setLeftInput] = useState(leftQuery)
  const [rightInput, setRightInput] = useState(rightQuery)
  const [left, setLeft] = useState(null)
  const [right, setRight] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => { setLeftInput(leftQuery); setRightInput(rightQuery) }, [leftQuery, rightQuery])
  useEffect(() => {
    if (!leftQuery || !rightQuery) { setLeft(null); setRight(null); return undefined }
    const controller = new AbortController(); setLoading(true); setError(null)
    Promise.all([loadClubByQuery(leftQuery, controller.signal), loadClubByQuery(rightQuery, controller.signal)])
      .then(([leftClub, rightClub]) => { setLeft(leftClub); setRight(rightClub) })
      .catch(loadError => { if (!isAbortError(loadError)) setError(loadError.message) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [leftQuery, rightQuery])

  const rows = useMemo(() => left && right ? metricRows(left, right) : [], [left, right])
  const leftDepth = useMemo(() => depth(left?.players || []), [left])
  const rightDepth = useMemo(() => depth(right?.players || []), [right])
  function submit(event) { event.preventDefault(); if (leftInput.trim() && rightInput.trim()) setSearchParams({ left: leftInput.trim(), right: rightInput.trim() }) }

  return <div>
    <div className="page-heading"><div><span className="eyebrow">Club intelligence</span><h1>Club comparison</h1></div></div>
    <form className="club-compare-form" onSubmit={submit}><label>First club<input value={leftInput} onChange={event => setLeftInput(event.target.value)} placeholder="e.g. Raja Casablanca" /></label><span>versus</span><label>Second club<input value={rightInput} onChange={event => setRightInput(event.target.value)} placeholder="e.g. Wydad Casablanca" /></label><button className="primary-button">Compare clubs</button></form>
    <p className="result-summary">Performance, injury and transfer totals are calculated from up to 25 returned squad profiles per club and may not cover every historical record.</p>
    {loading && <LoadingState label="Loading clubs, squads, output, injuries and transfer activity…" />}{error && <ErrorState message={error} />}
    {!loading && left && right && <>
      <div className="club-versus"><ClubCard data={left} onOpen={() => navigate(`/clubs/${left.id}`)} /><div className="versus-mark">VS</div><ClubCard data={right} onOpen={() => navigate(`/clubs/${right.id}`)} /></div>
      <section className="section"><h2>Side-by-side metrics</h2><div className="table-scroll"><table className="table comparison-table"><thead><tr><th>Metric</th><th>{left.club.name}</th><th>{right.club.name}</th></tr></thead><tbody>{rows.map(row => <tr key={row[0]}><td><strong>{row[0]}</strong></td><td>{row[1]}</td><td>{row[2]}</td></tr>)}</tbody></table></div></section>
      <section className="section"><h2>Position depth</h2><div className="depth-grid">{Object.keys(leftDepth).map(group => <article key={group}><h3>{group}</h3><div><span>{left.club.name}</span><strong>{leftDepth[group]}</strong></div><div><span>{right.club.name}</span><strong>{rightDepth[group]}</strong></div></article>)}</div></section>
      <section className="section"><h2>Top-valued players</h2><div className="dual-squad-grid"><TopPlayers data={left} navigate={navigate} /><TopPlayers data={right} navigate={navigate} /></div></section>
    </>}
    {!loading && (!leftQuery || !rightQuery) && <EmptyState title="Choose two clubs" message="Enter two club names to compare squad value, performance, contracts, injuries, transfer activity and position depth." />}
  </div>
}

function ClubCard({ data, onOpen }) { const details = data.club.squadDetails || {}; return <button className="club-versus-card" onClick={onOpen}><img src={data.club.crestUrl} alt="" onError={getImageFallback} /><h2>{data.club.name}</h2><strong>{formatMarketValue(details.totalMarketValue)}</strong><span>{details.squadSize ?? data.squad.length} players · Avg. age {details.averageAge ?? 'N/A'}</span></button> }
function TopPlayers({ data, navigate }) { const rows = [...data.players].sort((a,b) => Number(b.marketValueDetails?.current?.value || 0)-Number(a.marketValueDetails?.current?.value || 0)).slice(0,5); return <div><h3>{data.club.name}</h3>{rows.map(player => <button key={player.id} className="ranking-row" onClick={() => navigate(`/players/${player.id}`)}><img src={player.portraitUrl} alt="" onError={getImageFallback} /><span><strong>{player.name}</strong><small>{getPositionName(player.attributes?.position)}</small></span><b>{formatMarketValue(player.marketValueDetails?.current?.value)}</b></button>)}</div> }

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { getClub, getClubSquad, getPlayer, getPlayers, search } from '../api/client'
import { FORMATIONS, clubNameFromPlayer, transferFitScore } from '../api/recruitment'
import { formatMarketValue, getImageFallback, getPositionName, isAbortError } from '../api/utils'
import { EmptyState, ErrorState, LoadingState } from '../components/StateMessage'

export default function TransferFit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const clubQuery = searchParams.get('club') || ''
  const [clubInput, setClubInput] = useState(clubQuery)
  const [player, setPlayer] = useState(null)
  const [clubData, setClubData] = useState(null)
  const [squad, setSquad] = useState([])
  const [budget, setBudget] = useState('50')
  const [targetAge, setTargetAge] = useState('25')
  const [formation, setFormation] = useState('4-3-3')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => { const controller = new AbortController(); setLoading(true); getPlayer(id, { signal: controller.signal }).then(setPlayer).catch(loadError => { if (!isAbortError(loadError)) setError(loadError.message) }).finally(() => { if (!controller.signal.aborted) setLoading(false) }); return () => controller.abort() }, [id])
  useEffect(() => {
    if (!clubQuery) { setClubData(null); setSquad([]); return undefined }
    const controller = new AbortController(); setLoading(true); setError(null)
    async function loadClub() {
      try {
        const result = await search(clubQuery, { signal: controller.signal })
        const clubId = result.clubIds?.[0]
        if (!clubId) throw new Error(`No club found for “${clubQuery}”`)
        const [club, squadData] = await Promise.all([getClub(clubId, { signal: controller.signal }), getClubSquad(clubId, { signal: controller.signal }).catch(() => null)])
        const rows = Array.isArray(squadData) ? squadData : squadData?.squad || squadData?.players || []
        const ids = [...new Set(rows.map(item => item.playerId || item.id).filter(Boolean))]
        const profiles = ids.length ? await getPlayers(ids, { signal: controller.signal }).catch(() => []) : []
        setClubData({ id: clubId, club, rows }); setSquad(Array.isArray(profiles) ? profiles : [])
      } catch (loadError) { if (!isAbortError(loadError)) setError(loadError.message) }
      finally { if (!controller.signal.aborted) setLoading(false) }
    }
    loadClub(); return () => controller.abort()
  }, [clubQuery])

  const result = useMemo(() => player && clubData ? transferFitScore(player, clubData.club, squad, { ageTarget: targetAge, maxValue: Number(budget) * 1_000_000, formation }) : null, [player, clubData, squad, targetAge, budget, formation])
  function submit(event) { event.preventDefault(); const value = clubInput.trim(); if (value) setSearchParams({ club: value }) }

  if (loading && !player) return <LoadingState label="Loading player profile…" />
  if (error && !player) return <ErrorState message={error} />
  if (!player) return <EmptyState title="Player unavailable" />

  return <div>
    <div className="page-heading"><div><span className="eyebrow">Estimated recruitment model</span><h1>Transfer fit score</h1></div><button className="secondary-button" onClick={() => navigate(`/players/${player.id}`)}>Back to player</button></div>
    <section className="fit-hero"><div className="fit-player"><img src={player.portraitUrl} alt="" onError={getImageFallback} /><div><h2>{player.name}</h2><p>{getPositionName(player.attributes?.position)} · {player.lifeDates?.age ?? 'Age N/A'} · {clubNameFromPlayer(player) || 'Free agent'}</p><strong>{formatMarketValue(player.marketValueDetails?.current?.value)}</strong></div></div><div className="fit-arrow">→</div>{clubData ? <button className="fit-club" onClick={() => navigate(`/clubs/${clubData.id}`)}><img src={clubData.club.crestUrl} alt="" onError={getImageFallback} /><div><h2>{clubData.club.name}</h2><p>{squad.length} returned squad profiles</p></div></button> : <div className="fit-club placeholder"><strong>Select a destination club</strong></div>}</section>
    <section className="filter-panel"><form className="search-box" onSubmit={submit}><input value={clubInput} onChange={event => setClubInput(event.target.value)} placeholder="Destination club" /><button>Calculate fit</button></form><div className="fit-settings"><label>Recruitment budget (€m)<input type="number" min="1" value={budget} onChange={event => setBudget(event.target.value)} /></label><label>Preferred formation<select value={formation} onChange={event => setFormation(event.target.value)}>{Object.keys(FORMATIONS).map(name => <option key={name}>{name}</option>)}</select></label><label>Preferred target age<input type="number" min="16" max="40" value={targetAge} onChange={event => setTargetAge(event.target.value)} /></label></div><p className="filter-note">This is an estimate based on returned squad depth, player age, market value and contract leverage—not a prediction of a real transfer.</p></section>
    {loading && clubQuery && <LoadingState label="Analyzing destination squad…" />}{error && clubQuery && <ErrorState message={error} />}
    {result && !loading && <div className="fit-results"><section className="fit-score-card"><div className={`fit-score-ring score-${Math.floor(result.score / 20)}`}><strong>{result.score}</strong><span>/100</span></div><div><span className="eyebrow">Estimated fit</span><h2>{result.score >= 80 ? 'Excellent opportunity' : result.score >= 65 ? 'Strong fit' : result.score >= 50 ? 'Possible fit' : 'High-risk fit'}</h2><p>{result.sameRoleCount} comparable {result.targetRole} player{result.sameRoleCount === 1 ? '' : 's'} were found for {result.requiredRoles} relevant {formation} slot{result.requiredRoles === 1 ? '' : 's'} in the returned squad.</p></div></section><section className="fit-breakdown">{result.breakdown.map(item => <article key={item.label}><div><strong>{item.label}</strong><span>{item.value}/100</span></div><div className="score-bar"><span style={{ width: `${item.value}%` }} /></div><p>{item.explanation}</p></article>)}</section></div>}
    {!clubQuery && <EmptyState title="Choose a destination club" message="The model will estimate squad need, age fit, affordability and contract leverage." />}
  </div>
}

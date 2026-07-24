import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { COMPETITIONS } from '../api/competitionCatalog'
import { loadScoutingPool, MAX_SCOUTING_PROFILES } from '../api/scouting'
import { formatMarketValue, getClubFromAssignments, getClubName, getContractOpportunity, getImageFallback, getPositionName, isAbortError } from '../api/utils'
import WatchlistButton from '../components/WatchlistButton'
import { CardSkeletonGrid, EmptyState, ErrorState } from '../components/StateMessage'

const DEFAULT_SEASON = String(new Date().getFullYear() - 1)
const INITIAL = { position:'', minAge:'', maxAge:'', minValue:'', maxValue:'', minAppearances:'', minMinutes:'', minGoals:'15', minAssists:'15', contractMonths:'', freeAgentsOnly:false, sort:'contributions-desc' }
const NUMBERS = [['minAge','Minimum age',15,50],['maxAge','Maximum age',15,50],['minValue','Minimum value (€m)',0],['maxValue','Maximum value (€m)',0],['minAppearances','Minimum appearances',0],['minMinutes','Minimum minutes',0],['minGoals','Minimum goals',0],['minAssists','Minimum assists',0]]
const SORTS = [['contributions-desc','Most goal contributions'],['goals-desc','Most goals'],['assists-desc','Most assists'],['value-desc','Highest value'],['value-asc','Lowest value'],['age-asc','Youngest']]

function periodText(c) {
  if (c.period === 'all-time') return 'all career data'
  if (c.fromSeason && c.toSeason && c.fromSeason === c.toSeason) return `season ${c.fromSeason}`
  if (c.fromSeason && c.toSeason) return `seasons ${c.fromSeason}–${c.toSeason}`
  return c.fromSeason ? `season ${c.fromSeason} onward` : 'available seasons'
}

export default function Scouting() {
  const navigate = useNavigate()
  const [source,setSource] = useState('competition'), [competitionCode,setCompetitionCode] = useState('MAR1'), [query,setQuery] = useState('')
  const [period,setPeriod] = useState('season-range'), [fromSeason,setFromSeason] = useState(DEFAULT_SEASON), [toSeason,setToSeason] = useState('')
  const [run,setRun] = useState(null), [players,setPlayers] = useState([]), [stats,setStats] = useState({}), [filters,setFilters] = useState(INITIAL)
  const [coverage,setCoverage] = useState({clubs:0,discovered:0,analyzed:0}), [loading,setLoading] = useState(false), [error,setError] = useState(null), [retry,setRetry] = useState(0)

  useEffect(() => {
    if (!run) return undefined
    const controller = new AbortController()
    setLoading(true); setError(null); setPlayers([]); setStats({})
    loadScoutingPool(run,{signal:controller.signal,bypassCache:retry>0})
      .then(r => { if (!controller.signal.aborted) { setPlayers(r.profiles); setStats(r.stats); setCoverage(r.coverage) } })
      .catch(e => { if (!isAbortError(e)) setError(e.message) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  },[run,retry])

  const positions = useMemo(() => [...new Set(players.map(p => getPositionName(p.attributes?.position)).filter(Boolean))].sort(),[players])
  const results = useMemo(() => players.filter(p => {
    const s=stats[p.id], o=getContractOpportunity(p,Number(filters.contractMonths||18)), age=p.lifeDates?.age, value=Number(p.marketValueDetails?.current?.value||0)
    if (filters.position && getPositionName(p.attributes?.position)!==filters.position) return false
    if (filters.minAge && (age==null||age<Number(filters.minAge))) return false
    if (filters.maxAge && (age==null||age>Number(filters.maxAge))) return false
    if (filters.minValue && value<Number(filters.minValue)*1e6) return false
    if (filters.maxValue && value>Number(filters.maxValue)*1e6) return false
    for (const key of ['minAppearances','minMinutes','minGoals','minAssists']) if (filters[key] && (!s || s[key.slice(3).toLowerCase()]<Number(filters[key]))) return false
    if (filters.contractMonths && !['free-agent','expired','expiring'].includes(o.type)) return false
    return !filters.freeAgentsOnly || o.type==='free-agent'
  }).sort((a,b) => {
    const x=stats[a.id]||{}, y=stats[b.id]||{}
    if (filters.sort==='age-asc') return Number(a.lifeDates?.age??99)-Number(b.lifeDates?.age??99)
    if (filters.sort==='goals-desc') return Number(y.goals||0)-Number(x.goals||0)
    if (filters.sort==='assists-desc') return Number(y.assists||0)-Number(x.assists||0)
    if (filters.sort==='contributions-desc') return Number(y.goals||0)+Number(y.assists||0)-Number(x.goals||0)-Number(x.assists||0)
    if (filters.sort==='value-asc') return Number(a.marketValueDetails?.current?.value||0)-Number(b.marketValueDetails?.current?.value||0)
    return Number(b.marketValueDetails?.current?.value||0)-Number(a.marketValueDetails?.current?.value||0)
  }),[players,stats,filters])

  const setFilter=(key,value)=>setFilters(f=>({...f,[key]:value}))
  function submit(e) {
    e.preventDefault(); setError(null)
    if (source==='keyword'&&!query.trim()) return setError('Enter a keyword or use competition discovery.')
    if (period==='season-range'&&!fromSeason.trim()&&!toSeason.trim()) return setError('Enter a season start year, such as 2025.')
    setRun({source,competitionCode,query:query.trim(),period,fromSeason:fromSeason.trim(),toSeason:toSeason.trim(),prefilters:{position:filters.position,minAge:filters.minAge,maxAge:filters.maxAge,minValue:filters.minValue,maxValue:filters.maxValue}})
  }

  return <div>
    <div className="page-heading"><div><span className="eyebrow">Recruitment workspace</span><h1>Advanced scouting</h1></div></div>
    <form className="filter-panel" onSubmit={submit}>
      <div className="filter-grid scouting-filter-grid">
        <label>Candidate source<select value={source} onChange={e=>setSource(e.target.value)}><option value="competition">Competition squads</option><option value="keyword">Optional keyword</option></select></label>
        {source==='competition'?<label>Competition<select value={competitionCode} onChange={e=>setCompetitionCode(e.target.value)}>{COMPETITIONS.filter(x=>!['CL','EL','UCOL'].includes(x.code)).map(x=><option key={x.code} value={x.code}>{x.name} · {x.country}</option>)}</select></label>:<label>Keyword<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Club, league, country or position" /></label>}
        <label>Statistics period<select value={period} onChange={e=>setPeriod(e.target.value)}><option value="season-range">Season or range</option><option value="all-time">All career</option></select></label>
        {period==='season-range'&&<><label>From season<input inputMode="numeric" value={fromSeason} onChange={e=>setFromSeason(e.target.value)} placeholder="2025" /></label><label>To season (optional)<input inputMode="numeric" value={toSeason} onChange={e=>setToSeason(e.target.value)} placeholder="2025" /></label></>}
        <label>Position<select value={filters.position} onChange={e=>setFilter('position',e.target.value)}><option value="">All positions</option>{positions.map(x=><option key={x}>{x}</option>)}</select></label>
        {NUMBERS.map(([key,label,min,max])=><label key={key}>{label}<input type="number" min={min} max={max} value={filters[key]} onChange={e=>setFilter(key,e.target.value)} /></label>)}
        <label>Contract expires within<select value={filters.contractMonths} onChange={e=>setFilter('contractMonths',e.target.value)}><option value="">Any contract</option>{[6,12,18,24].map(x=><option key={x} value={x}>{x} months</option>)}</select></label>
        <label>Sort results<select value={filters.sort} onChange={e=>setFilter('sort',e.target.value)}>{SORTS.map(([v,t])=><option key={v} value={v}>{t}</option>)}</select></label>
      </div>
      <div className="heading-actions"><label className="advanced-toggle"><input type="checkbox" checked={filters.freeAgentsOnly} onChange={e=>setFilter('freeAgentsOnly',e.target.checked)} /> Free agents only</label><button className="text-link reset-button" type="button" onClick={()=>setFilters(INITIAL)}>Reset</button><button className="primary-button">Find players</button></div>
      <p className="filter-note">2025 means season 2025/26. Exact calendar dates are unavailable because the provider returns season totals, not dated match events.</p>
    </form>
    {error&&<ErrorState message={error} onRetry={run?()=>setRetry(x=>x+1):undefined}/>} {loading&&<CardSkeletonGrid count={8}/>} {!run&&!loading&&<EmptyState title="Build a scouting brief" message="Choose a competition, period and thresholds. No player name is required."/>}
    {!loading&&!error&&run&&!results.length&&<EmptyState title="No profiles match" message="Try another competition, season range or lower a threshold."/>}
    {!loading&&!error&&run&&results.length>0&&<><p className="result-summary"><strong>{results.length}</strong> matches using {periodText(run)} · {coverage.clubs?`${coverage.clubs} clubs · `:''}{coverage.analyzed} analyzed{coverage.discovered>coverage.analyzed&&` from ${coverage.discovered} discovered (limit ${MAX_SCOUTING_PROFILES})`}.</p><div className="card-grid scouting-grid">{results.map(p=>{const club=getClubFromAssignments(p.clubAssignments),s=stats[p.id],o=getContractOpportunity(p,Number(filters.contractMonths||18));return <article className="card scout-card" key={p.id} onClick={()=>navigate(`/players/${p.id}`)}><div className="scout-card-top"><img src={p.portraitUrl} alt="" onError={getImageFallback}/><div><h2>{p.name}</h2><p>{getPositionName(p.attributes?.position)||'Position unavailable'}</p><small>{getClubName(club)||'Free agent'}</small></div></div><div className="scout-metrics">{[['Apps',s?.appearances],['Goals',s?.goals],['Assists',s?.assists],['Minutes',s?.minutes]].map(([k,v])=><span key={k}>{k}<strong>{v??'-'}</strong></span>)}</div><div className="card-actions"><strong className="card-price">{formatMarketValue(p.marketValueDetails?.current?.value)}</strong><span className={`opportunity-badge ${o.type}`}>{o.label}</span></div><WatchlistButton player={p} compact/></article>})}</div></>}
  </div>
}

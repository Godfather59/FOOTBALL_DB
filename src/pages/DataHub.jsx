import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getOpenLigaAvailableLeagues,
  getOpenLigaGoalGetters,
  getOpenLigaMatches,
  getOpenLigaTable,
  getPlayers,
  getSportsDbLeagues,
  getStatsBombCompetitions,
  getStatsBombMatches,
  search,
  searchSportsDbPlayers,
  searchSportsDbTeams
} from '../api/client'
import {
  FREE_PROVIDERS,
  normalizeOpenLigaGoalGetters,
  normalizeOpenLigaTable,
  normalizeSportsDbPlayers,
  normalizeSportsDbTeams,
  normalizeStatsBombCompetitions
} from '../api/freeProviders'
import { playerSearchVariants, teamSearchVariants } from '../api/searchAliases'
import { formatMarketValue, getImageFallback } from '../api/utils'
import { EmptyState, ErrorState, LoadingState } from '../components/StateMessage'

const DEFAULT_SEASON = String(new Date().getFullYear() - 1)
const HUB_PROVIDER_IDS = ['thesportsdb', 'openligadb', 'statsbomb-open']

function openLigaMatches(payload) {
  return (Array.isArray(payload) ? payload : []).map(match => {
    const finalResult = (match.matchResults || []).find(result => result.resultTypeID === 2) || (match.matchResults || []).at(-1)
    return {
      id: match.matchID,
      date: match.matchDateTimeUTC || match.matchDateTime,
      competition: match.leagueName || '',
      home: match.team1?.teamName || '',
      away: match.team2?.teamName || '',
      homeScore: finalResult?.pointsTeam1,
      awayScore: finalResult?.pointsTeam2,
      status: match.matchIsFinished ? 'FINISHED' : 'SCHEDULED'
    }
  })
}

function statsBombMatches(payload) {
  return (Array.isArray(payload) ? payload : []).map(match => ({
    id: match.match_id,
    date: match.match_date,
    competition: match.competition?.competition_name || '',
    home: match.home_team?.home_team_name || '',
    away: match.away_team?.away_team_name || '',
    homeScore: match.home_score,
    awayScore: match.away_score,
    status: match.match_status || 'historical'
  }))
}

function providerModes(provider) {
  if (provider === 'thesportsdb') return [['teams', 'Search teams'], ['players', 'Search players'], ['leagues', 'Leagues by country']]
  if (provider === 'openligadb') return [['leagues', 'Available leagues'], ['standings', 'Standings'], ['scorers', 'Goal scorers'], ['matches', 'Season matches']]
  if (provider === 'statsbomb-open') return [['competitions', 'Competition seasons'], ['matches', 'Historical matches']]
  return []
}

async function findSportsDbTeams(query) {
  for (const variant of teamSearchVariants(query)) {
    const rows = normalizeSportsDbTeams(await searchSportsDbTeams(variant))
    if (rows.length) return { rows, matchedQuery: variant }
  }
  return { rows: [], matchedQuery: query }
}

async function findSportsDbPlayers(query) {
  for (const variant of playerSearchVariants(query)) {
    const players = normalizeSportsDbPlayers(await searchSportsDbPlayers(variant))
    if (players.length) return { players, matchedQuery: variant, source: 'thesportsdb' }
  }

  const marketSearch = await search(query)
  const ids = (marketSearch.playerIds || []).slice(0, 10)
  const players = ids.length ? await getPlayers(ids) : []
  return { players, matchedQuery: query, source: 'market-fallback' }
}

function StandingsTable({ rows }) {
  return <div className="table-scroll"><table className="table standings-table"><thead><tr><th>#</th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th></tr></thead><tbody>{rows.map((row, index) => <tr key={row.teamId || row.teamName || index}><td>{row.position ?? index + 1}</td><td><span className="table-team">{row.crest && <img src={row.crest} alt="" onError={getImageFallback} />}<strong>{row.teamName}</strong></span></td><td>{row.played ?? '-'}</td><td>{row.won ?? '-'}</td><td>{row.draw ?? '-'}</td><td>{row.lost ?? '-'}</td><td>{row.goalsFor ?? '-'}</td><td>{row.goalsAgainst ?? '-'}</td><td>{row.goalDifference ?? '-'}</td><td><strong>{row.points ?? '-'}</strong></td></tr>)}</tbody></table></div>
}

function MatchTable({ rows }) {
  return <div className="table-scroll"><table className="table provider-match-table"><thead><tr><th>Date</th><th>Competition</th><th>Home</th><th>Score</th><th>Away</th><th>Status</th></tr></thead><tbody>{rows.map((row, index) => <tr key={row.id || index}><td>{row.date ? new Date(row.date).toLocaleDateString() : '-'}</td><td>{row.competition || '-'}</td><td><strong>{row.home}</strong></td><td>{row.homeScore ?? '-'} – {row.awayScore ?? '-'}</td><td><strong>{row.away}</strong></td><td>{row.status}</td></tr>)}</tbody></table></div>
}

function PlayerRows({ players, stats, onFindProfile, onOpenProfile }) {
  return <div className="provider-result-grid">{players.map(player => {
    const playerStats = stats?.[player.id] || {}
    const isMarketProfile = player.provider !== 'thesportsdb' && player.provider !== 'openligadb'
    const clubName = player.clubAssignments?.[0]?.clubName
    return <article className="provider-result-card" key={player.id}>
      <div className="scout-card-top"><img src={player.portraitUrl} alt="" onError={getImageFallback} /><div><h2>{player.name}</h2><p>{player.attributes?.position?.name || 'Position unavailable'}</p><small>{clubName || (isMarketProfile ? 'No current club returned' : player.nationality || 'Metadata unavailable')}</small></div></div>
      <div className="scout-metrics">{[['Apps', playerStats.appearances], ['Goals', playerStats.goals], ['Assists', playerStats.assists]].map(([label, value]) => <span key={label}>{label}<strong>{value ?? '-'}</strong></span>)}</div>
      {isMarketProfile && <strong>{formatMarketValue(player.marketValueDetails?.current?.value)}</strong>}
      <button className="secondary-button" type="button" onClick={() => isMarketProfile ? onOpenProfile(player.id) : onFindProfile(player.name)}>{isMarketProfile ? 'Open current profile' : 'Find market profile'}</button>
    </article>
  })}</div>
}

export default function DataHub() {
  const navigate = useNavigate()
  const [provider, setProvider] = useState('thesportsdb')
  const [mode, setMode] = useState('teams')
  const [season, setSeason] = useState(DEFAULT_SEASON)
  const [query, setQuery] = useState('Raja Club Athletic')
  const [country, setCountry] = useState('Morocco')
  const [shortcut, setShortcut] = useState('bl1')
  const [statsBombSelection, setStatsBombSelection] = useState('')
  const [result, setResult] = useState(null)
  const [statsBombCatalog, setStatsBombCatalog] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const modes = providerModes(provider)
  const selectedStatsBomb = useMemo(() => statsBombCatalog.find(item => item.id === statsBombSelection), [statsBombCatalog, statsBombSelection])

  function changeProvider(nextProvider) {
    setProvider(nextProvider)
    setMode(providerModes(nextProvider)[0]?.[0] || '')
    setResult(null)
    setError(null)
  }

  async function submit(event) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      if (provider === 'thesportsdb') {
        if (mode === 'teams') {
          const found = await findSportsDbTeams(query.trim())
          setResult({ type: 'teams', rows: found.rows, note: found.matchedQuery !== query.trim() ? `No exact record was returned for “${query.trim()}”. The compatible database name “${found.matchedQuery}” was used.` : 'TheSportsDB team records are useful metadata, but their squad-member lists may be incomplete.' })
        }
        if (mode === 'players') {
          const found = await findSportsDbPlayers(query.trim())
          setResult({ type: 'players', players: found.players, stats: {}, note: found.source === 'market-fallback' ? `TheSportsDB returned no player profile for “${query.trim()}”. Results below come from the no-key market-profile fallback.` : found.matchedQuery !== query.trim() ? `Matched the spelling variant “${found.matchedQuery}”.` : '' })
        }
        if (mode === 'leagues') {
          const payload = await getSportsDbLeagues(country.trim())
          setResult({ type: 'leagues', rows: payload?.countries || payload?.leagues || [] })
        }
      }
      if (provider === 'openligadb') {
        if (mode === 'leagues') setResult({ type: 'leagues', rows: await getOpenLigaAvailableLeagues(season) })
        if (mode === 'standings') setResult({ type: 'standings', rows: normalizeOpenLigaTable(await getOpenLigaTable(shortcut.trim(), season)) })
        if (mode === 'scorers') {
          const normalized = normalizeOpenLigaGoalGetters(await getOpenLigaGoalGetters(shortcut.trim(), season), { openLigaShortcut: shortcut.trim() }, season)
          setResult({ type: 'players', players: normalized.players, stats: normalized.stats })
        }
        if (mode === 'matches') setResult({ type: 'matches', rows: openLigaMatches(await getOpenLigaMatches(shortcut.trim(), season)) })
      }
      if (provider === 'statsbomb-open') {
        if (mode === 'competitions') {
          const rows = normalizeStatsBombCompetitions(await getStatsBombCompetitions())
          setStatsBombCatalog(rows)
          if (!statsBombSelection && rows[0]) setStatsBombSelection(rows[0].id)
          setResult({ type: 'statsbomb-competitions', rows })
        }
        if (mode === 'matches') {
          let selection = selectedStatsBomb
          if (!selection) {
            const rows = normalizeStatsBombCompetitions(await getStatsBombCompetitions())
            setStatsBombCatalog(rows)
            selection = rows[0]
            if (selection) setStatsBombSelection(selection.id)
          }
          if (!selection) throw new Error('StatsBomb Open Data returned no competition seasons.')
          setResult({ type: 'matches', rows: statsBombMatches(await getStatsBombMatches(selection.competitionId, selection.seasonId)) })
        }
      }
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }

  const providerInfo = FREE_PROVIDERS.find(item => item.id === provider)
  const providers = FREE_PROVIDERS.filter(item => HUB_PROVIDER_IDS.includes(item.id))

  return <div>
    <div className="page-heading"><div><span className="eyebrow">Zero-configuration data layer</span><h1>Free Data Hub</h1><p>Every provider on this page works without creating an account, copying a token or editing an environment file.</p></div><button className="primary-button" type="button" onClick={() => navigate('/scout')}>Open scouting</button></div>

    <section className="provider-grid">{providers.map(item => <button type="button" className={`provider-card ${provider === item.id ? 'active' : ''}`} key={item.id} onClick={() => changeProvider(item.id)}><span className="provider-key">{item.keyRequirement}</span><h2>{item.name}</h2><p>{item.description}</p><small>{item.capabilities.join(' · ')}</small></button>)}</section>

    <form className="filter-panel provider-explorer" onSubmit={submit}>
      <div className="section-heading"><span className="eyebrow">{providerInfo?.name}</span><h2>{providerInfo?.description}</h2></div>
      <div className="filter-grid">
        <label>Data type<select value={mode} onChange={event => { setMode(event.target.value); setResult(null) }}>{modes.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        {provider === 'thesportsdb' && mode !== 'leagues' && <label>Team or player name<input value={query} onChange={event => setQuery(event.target.value)} required /></label>}
        {provider === 'thesportsdb' && mode === 'leagues' && <label>Country<input value={country} onChange={event => setCountry(event.target.value)} required /></label>}
        {provider === 'openligadb' && <><label>Season start year<input value={season} onChange={event => setSeason(event.target.value)} inputMode="numeric" /></label>{mode !== 'leagues' && <label>League shortcut<input value={shortcut} onChange={event => setShortcut(event.target.value)} placeholder="bl1" /></label>}</>}
        {provider === 'statsbomb-open' && mode === 'matches' && <label>Competition season<select value={statsBombSelection} onChange={event => setStatsBombSelection(event.target.value)}><option value="">Load first available dataset</option>{statsBombCatalog.map(item => <option key={item.id} value={item.id}>{item.name} · {item.seasonName}</option>)}</select></label>}
      </div>
      {provider === 'statsbomb-open' && <p className="filter-note">StatsBomb Open Data is supplied for research and education. Keep StatsBomb/Hudl attribution when publishing analysis.</p>}
      <button className="primary-button">Load free data</button>
    </form>

    {loading && <LoadingState label="Loading provider data…" />}
    {error && <ErrorState message={error} />}
    {!loading && !error && !result && <EmptyState title="Choose a no-key provider query" message="TheSportsDB public access, OpenLigaDB and StatsBomb Open Data work immediately with no setup." />}
    {!loading && !error && result?.note && <p className="filter-note provider-result-note">{result.note}</p>}
    {!loading && !error && result?.type === 'standings' && (result.rows.length ? <StandingsTable rows={result.rows} /> : <EmptyState title="No standings returned" />)}
    {!loading && !error && result?.type === 'matches' && (result.rows.length ? <MatchTable rows={result.rows} /> : <EmptyState title="No matches returned" />)}
    {!loading && !error && result?.type === 'players' && (result.players.length ? <PlayerRows players={result.players} stats={result.stats} onFindProfile={name => navigate(`/players?q=${encodeURIComponent(name)}`)} onOpenProfile={id => navigate(`/players/${id}`)} /> : <EmptyState title="No players returned" />)}
    {!loading && !error && result?.type === 'teams' && (result.rows.length ? <div className="provider-result-grid">{result.rows.map(team => <article className="provider-result-card" key={team.id}>{team.badge && <img className="provider-team-badge" src={team.badge} alt="" onError={getImageFallback} />}<h2>{team.name}</h2><p>{team.league} · {team.country}</p><small>{team.stadium || 'Stadium unavailable'}{team.formedYear ? ` · Founded ${team.formedYear}` : ''}</small></article>)}</div> : <EmptyState title="No teams returned" />)}
    {!loading && !error && result?.type === 'leagues' && (result.rows.length ? <div className="provider-result-grid">{result.rows.map((league, index) => <article className="provider-result-card" key={league.idLeague || league.leagueId || index}><h2>{league.strLeague || league.leagueName || league.strLeagueAlternate || 'League'}</h2><p>{league.strCountry || league.leagueShortcut || league.strSport || ''}</p><small>{league.strCurrentSeason || league.leagueSeason || league.idLeague || league.leagueId || ''}</small></article>)}</div> : <EmptyState title="No leagues returned" />)}
    {!loading && !error && result?.type === 'statsbomb-competitions' && (result.rows.length ? <div className="provider-result-grid">{result.rows.map(item => <button className="provider-result-card selectable" type="button" key={item.id} onClick={() => { setStatsBombSelection(item.id); setMode('matches'); setResult(null) }}><h2>{item.name}</h2><p>{item.country} · {item.seasonName}</p><small>{item.gender || 'Competition'} · select to load matches</small></button>)}</div> : <EmptyState title="No StatsBomb datasets returned" />)}
  </div>
}

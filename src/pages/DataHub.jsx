import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { COMPETITIONS } from '../api/competitionCatalog'
import {
  getFootballDataMatches,
  getFootballDataScorers,
  getFootballDataStandings,
  getOpenLigaAvailableLeagues,
  getOpenLigaGoalGetters,
  getOpenLigaMatches,
  getOpenLigaTable,
  getSportsDbLeagues,
  getStatsBombCompetitions,
  getStatsBombMatches,
  searchSportsDbPlayers,
  searchSportsDbTeams
} from '../api/client'
import {
  FREE_PROVIDERS,
  normalizeFootballDataScorers,
  normalizeFootballDataStandings,
  normalizeOpenLigaGoalGetters,
  normalizeOpenLigaTable,
  normalizeSportsDbPlayers,
  normalizeSportsDbTeams,
  normalizeStatsBombCompetitions
} from '../api/freeProviders'
import { getImageFallback } from '../api/utils'
import { EmptyState, ErrorState, LoadingState } from '../components/StateMessage'

const DEFAULT_SEASON = String(new Date().getFullYear() - 1)
const FOOTBALL_DATA_COMPETITIONS = COMPETITIONS.filter(item => item.footballDataCode)

function footballDataMatches(payload) {
  return (payload?.matches || []).map(match => ({
    id: match.id,
    date: match.utcDate,
    competition: match.competition?.name || '',
    home: match.homeTeam?.name || '',
    away: match.awayTeam?.name || '',
    homeScore: match.score?.fullTime?.home,
    awayScore: match.score?.fullTime?.away,
    status: match.status || ''
  }))
}

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
  if (provider === 'football-data') return [['standings', 'Standings'], ['scorers', 'Top scorers'], ['matches', 'Season matches']]
  if (provider === 'thesportsdb') return [['teams', 'Search teams'], ['players', 'Search players'], ['leagues', 'Leagues by country']]
  if (provider === 'openligadb') return [['leagues', 'Available leagues'], ['standings', 'Standings'], ['scorers', 'Goal scorers'], ['matches', 'Season matches']]
  if (provider === 'statsbomb-open') return [['competitions', 'Competition seasons'], ['matches', 'Historical matches']]
  return []
}

function StandingsTable({ rows }) {
  return <div className="table-scroll"><table className="table standings-table"><thead><tr><th>#</th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th></tr></thead><tbody>{rows.map((row, index) => <tr key={row.teamId || row.teamName || index}><td>{row.position ?? index + 1}</td><td><span className="table-team">{row.crest && <img src={row.crest} alt="" onError={getImageFallback} />}<strong>{row.teamName}</strong></span></td><td>{row.played ?? '-'}</td><td>{row.won ?? '-'}</td><td>{row.draw ?? '-'}</td><td>{row.lost ?? '-'}</td><td>{row.goalsFor ?? '-'}</td><td>{row.goalsAgainst ?? '-'}</td><td>{row.goalDifference ?? '-'}</td><td><strong>{row.points ?? '-'}</strong></td></tr>)}</tbody></table></div>
}

function MatchTable({ rows }) {
  return <div className="table-scroll"><table className="table provider-match-table"><thead><tr><th>Date</th><th>Competition</th><th>Home</th><th>Score</th><th>Away</th><th>Status</th></tr></thead><tbody>{rows.map((row, index) => <tr key={row.id || index}><td>{row.date ? new Date(row.date).toLocaleDateString() : '-'}</td><td>{row.competition || '-'}</td><td><strong>{row.home}</strong></td><td>{row.homeScore ?? '-'} – {row.awayScore ?? '-'}</td><td><strong>{row.away}</strong></td><td>{row.status}</td></tr>)}</tbody></table></div>
}

function PlayerRows({ players, stats, onFindProfile }) {
  return <div className="provider-result-grid">{players.map(player => { const playerStats = stats?.[player.id] || {}; return <article className="provider-result-card" key={player.id}><div className="scout-card-top"><img src={player.portraitUrl} alt="" onError={getImageFallback} /><div><h2>{player.name}</h2><p>{player.attributes?.position?.name || 'Position unavailable'}</p><small>{player.clubAssignments?.[0]?.clubName || player.nationality || 'Metadata unavailable'}</small></div></div><div className="scout-metrics">{[['Apps', playerStats.appearances], ['Goals', playerStats.goals], ['Assists', playerStats.assists]].map(([label, value]) => <span key={label}>{label}<strong>{value ?? '-'}</strong></span>)}</div><button className="secondary-button" type="button" onClick={() => onFindProfile(player.name)}>Find market profile</button></article> })}</div>
}

export default function DataHub() {
  const navigate = useNavigate()
  const [provider, setProvider] = useState('thesportsdb')
  const [mode, setMode] = useState('teams')
  const [season, setSeason] = useState(DEFAULT_SEASON)
  const [competitionCode, setCompetitionCode] = useState('GB1')
  const [query, setQuery] = useState('Raja Casablanca')
  const [country, setCountry] = useState('Morocco')
  const [shortcut, setShortcut] = useState('bl1')
  const [statsBombSelection, setStatsBombSelection] = useState('')
  const [result, setResult] = useState(null)
  const [statsBombCatalog, setStatsBombCatalog] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const selectedCompetition = FOOTBALL_DATA_COMPETITIONS.find(item => item.code === competitionCode) || FOOTBALL_DATA_COMPETITIONS[0]
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
      if (provider === 'football-data') {
        if (mode === 'standings') setResult({ type: 'standings', rows: normalizeFootballDataStandings(await getFootballDataStandings(selectedCompetition.footballDataCode, season)) })
        if (mode === 'scorers') {
          const normalized = normalizeFootballDataScorers(await getFootballDataScorers(selectedCompetition.footballDataCode, season, 100), selectedCompetition, season)
          setResult({ type: 'players', players: normalized.players, stats: normalized.stats })
        }
        if (mode === 'matches') setResult({ type: 'matches', rows: footballDataMatches(await getFootballDataMatches(selectedCompetition.footballDataCode, season)) })
      }
      if (provider === 'thesportsdb') {
        if (mode === 'teams') setResult({ type: 'teams', rows: normalizeSportsDbTeams(await searchSportsDbTeams(query.trim())) })
        if (mode === 'players') setResult({ type: 'players', players: normalizeSportsDbPlayers(await searchSportsDbPlayers(query.trim())), stats: {} })
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
  return <div>
    <div className="page-heading"><div><span className="eyebrow">No-cost data layer</span><h1>Free Data Hub</h1><p>Explore each provider only within the capabilities its free tier actually supplies.</p></div><button className="primary-button" type="button" onClick={() => navigate('/scout')}>Open scouting</button></div>

    <section className="provider-grid">{FREE_PROVIDERS.filter(item => !['auto-free', 'legacy-keyword'].includes(item.id)).map(item => <button type="button" className={`provider-card ${provider === item.id ? 'active' : ''}`} key={item.id} onClick={() => changeProvider(item.id)}><span className="provider-key">{item.keyRequirement}</span><h2>{item.name}</h2><p>{item.description}</p><small>{item.capabilities.join(' · ')}</small></button>)}</section>

    {provider === 'api-football' ? <section className="filter-panel provider-intro"><h2>API-Football detailed scouting</h2><p>API-Football is already integrated into Advanced Scouting with league resolution, pagination, caching and automatic fallback. Its private key remains on the server.</p><button className="primary-button" type="button" onClick={() => navigate('/scout')}>Use API-Football scouting</button></section> : <form className="filter-panel provider-explorer" onSubmit={submit}>
      <div className="section-heading"><span className="eyebrow">{providerInfo?.name}</span><h2>{providerInfo?.description}</h2></div>
      <div className="filter-grid">
        <label>Data type<select value={mode} onChange={event => { setMode(event.target.value); setResult(null) }}>{modes.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        {provider === 'football-data' && <><label>Competition<select value={competitionCode} onChange={event => setCompetitionCode(event.target.value)}>{FOOTBALL_DATA_COMPETITIONS.map(item => <option key={item.code} value={item.code}>{item.name} · {item.country}</option>)}</select></label><label>Season start year<input value={season} onChange={event => setSeason(event.target.value)} inputMode="numeric" /></label></>}
        {provider === 'thesportsdb' && mode !== 'leagues' && <label>Team or player name<input value={query} onChange={event => setQuery(event.target.value)} required /></label>}
        {provider === 'thesportsdb' && mode === 'leagues' && <label>Country<input value={country} onChange={event => setCountry(event.target.value)} required /></label>}
        {provider === 'openligadb' && <><label>Season start year<input value={season} onChange={event => setSeason(event.target.value)} inputMode="numeric" /></label>{mode !== 'leagues' && <label>League shortcut<input value={shortcut} onChange={event => setShortcut(event.target.value)} placeholder="bl1" /></label>}</>}
        {provider === 'statsbomb-open' && mode === 'matches' && <label>Competition season<select value={statsBombSelection} onChange={event => setStatsBombSelection(event.target.value)}><option value="">Load first available dataset</option>{statsBombCatalog.map(item => <option key={item.id} value={item.id}>{item.name} · {item.seasonName}</option>)}</select></label>}
      </div>
      <button className="primary-button">Load free data</button>
    </form>}

    {loading && <LoadingState label="Loading provider data…" />}
    {error && <ErrorState message={error} />}
    {!loading && !error && provider !== 'api-football' && !result && <EmptyState title="Choose a provider query" message="No-key providers work immediately. API-Football and football-data.org require their free server-side keys." />}
    {!loading && !error && result?.type === 'standings' && (result.rows.length ? <StandingsTable rows={result.rows} /> : <EmptyState title="No standings returned" />)}
    {!loading && !error && result?.type === 'matches' && (result.rows.length ? <MatchTable rows={result.rows} /> : <EmptyState title="No matches returned" />)}
    {!loading && !error && result?.type === 'players' && (result.players.length ? <PlayerRows players={result.players} stats={result.stats} onFindProfile={name => navigate(`/players?q=${encodeURIComponent(name)}`)} /> : <EmptyState title="No players returned" />)}
    {!loading && !error && result?.type === 'teams' && (result.rows.length ? <div className="provider-result-grid">{result.rows.map(team => <article className="provider-result-card" key={team.id}>{team.badge && <img className="provider-team-badge" src={team.badge} alt="" onError={getImageFallback} />}<h2>{team.name}</h2><p>{team.league} · {team.country}</p><small>{team.stadium || 'Stadium unavailable'}{team.formedYear ? ` · Founded ${team.formedYear}` : ''}</small></article>)}</div> : <EmptyState title="No teams returned" />)}
    {!loading && !error && result?.type === 'leagues' && (result.rows.length ? <div className="provider-result-grid">{result.rows.map((league, index) => <article className="provider-result-card" key={league.idLeague || league.leagueId || index}><h2>{league.strLeague || league.leagueName || league.strLeagueAlternate || 'League'}</h2><p>{league.strCountry || league.leagueShortcut || league.strSport || ''}</p><small>{league.strCurrentSeason || league.leagueSeason || league.idLeague || league.leagueId || ''}</small></article>)}</div> : <EmptyState title="No leagues returned" />)}
    {!loading && !error && result?.type === 'statsbomb-competitions' && (result.rows.length ? <div className="provider-result-grid">{result.rows.map(item => <button className="provider-result-card selectable" type="button" key={item.id} onClick={() => { setStatsBombSelection(item.id); setMode('matches'); setResult(null) }}><h2>{item.name}</h2><p>{item.country} · {item.seasonName}</p><small>{item.gender || 'Competition'} · select to load matches</small></button>)}</div> : <EmptyState title="No StatsBomb datasets returned" />)}
  </div>
}

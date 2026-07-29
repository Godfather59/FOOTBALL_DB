import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getClubSquad, getPlayers, search } from '../api/client'
import { FORMATIONS, roleMatches, squadSummary } from '../api/recruitment'
import { formatMarketValue, getImageFallback, isAbortError } from '../api/utils'
import { EmptyState } from '../components/StateMessage'
import { useWatchlist } from '../context/WatchlistContext'

const STORAGE_KEY = 'football-db-squad-plans-v1'

function createSlots(formation, previous = []) {
  return FORMATIONS[formation].map(([role, x, y], index) => ({ id: `${role}-${index}`, role, x, y, player: previous[index]?.player || null }))
}

function readPlans() {
  try { const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]'); return Array.isArray(value) ? value : [] } catch { return [] }
}

export default function SquadPlanner() {
  const { items } = useWatchlist()
  const navigate = useNavigate()
  const [formation, setFormation] = useState('4-3-3')
  const [slots, setSlots] = useState(() => createSlots('4-3-3'))
  const [plans, setPlans] = useState(readPlans)
  const [planName, setPlanName] = useState('Recruitment XI')
  const [clubQuery, setClubQuery] = useState('')
  const [clubPlayers, setClubPlayers] = useState([])
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState('')
  const availablePlayers = useMemo(() => { const map = new Map([...items, ...clubPlayers].map(player => [String(player.id), player])); return [...map.values()] }, [items, clubPlayers])
  const summary = useMemo(() => squadSummary(slots), [slots])

  function changeFormation(nextFormation) {
    setFormation(nextFormation)
    setSlots(createSlots(nextFormation, slots))
  }

  function assignPlayer(slotId, playerId) {
    const player = availablePlayers.find(item => String(item.id) === String(playerId))
    if (!player) return
    setSlots(current => current.map(slot => slot.id === slotId ? { ...slot, player } : slot.player?.id === player.id ? { ...slot, player: null } : slot))
  }

  function removePlayer(slotId) { setSlots(current => current.map(slot => slot.id === slotId ? { ...slot, player: null } : slot)) }

  function savePlan() {
    const plan = { id: Date.now(), name: planName.trim() || 'Untitled squad', formation, slots, updatedAt: new Date().toISOString() }
    const next = [plan, ...plans.filter(item => item.name !== plan.name)].slice(0, 12)
    setPlans(next); window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  function loadPlan(plan) { setPlanName(plan.name); setFormation(plan.formation); setSlots(plan.slots) }
  function deletePlan(id) { const next = plans.filter(plan => plan.id !== id); setPlans(next); window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) }

  async function importClub(event) {
    event.preventDefault()
    const value = clubQuery.trim()
    if (!value) return
    setImporting(true); setImportError('')
    try {
      const result = await search(value)
      const clubId = result.clubIds?.[0]
      if (!clubId) throw new Error(`No club found for “${value}”`)
      const data = await getClubSquad(clubId)
      const rows = Array.isArray(data) ? data : data?.squad || data?.players || []
      const ids = [...new Set(rows.map(item => item.playerId || item.id).filter(Boolean))]
      const profiles = ids.length ? await getPlayers(ids) : []
      const normalized = (profiles || []).map(player => ({ ...player, position: player.attributes?.position?.name || '', age: player.lifeDates?.age ?? null, marketValue: player.marketValueDetails?.current?.value ?? null }))
      setClubPlayers(normalized)
    } catch (error) { if (!isAbortError(error)) setImportError(error.message) } finally { setImporting(false) }
  }

  return <div>
    <div className="page-heading"><div><span className="eyebrow">Formation builder</span><h1>Squad planner</h1></div><div className="heading-actions"><button className="secondary-button" onClick={() => navigate('/watchlist')}>Manage shortlists</button><button className="primary-button" onClick={savePlan}>Save plan</button></div></div>
    <section className="planner-controls"><label>Plan name<input value={planName} onChange={event => setPlanName(event.target.value)} /></label><label>Formation<select value={formation} onChange={event => changeFormation(event.target.value)}>{Object.keys(FORMATIONS).map(name => <option key={name}>{name}</option>)}</select></label><button className="secondary-button" onClick={() => setSlots(createSlots(formation))}>Clear pitch</button></section><section className="club-import-panel"><form onSubmit={importClub}><input value={clubQuery} onChange={event => setClubQuery(event.target.value)} placeholder="Import an existing club squad" /><button className="secondary-button" disabled={importing}>{importing ? 'Importing…' : 'Import club'}</button></form><p>{importError || `${items.length} shortlisted target${items.length === 1 ? '' : 's'} · ${clubPlayers.length} imported club player${clubPlayers.length === 1 ? '' : 's'}`}</p></section>

    <div className="planner-layout">
      <section className="pitch" aria-label={`${formation} squad pitch`}>
        <div className="pitch-line center-line" /><div className="pitch-circle" /><div className="pitch-box top-box" /><div className="pitch-box bottom-box" />
        {slots.map(slot => <div key={slot.id} className={`pitch-slot ${slot.player && !roleMatches(slot.role, slot.player.position) ? 'mismatch' : ''}`} style={{ left: `${slot.x}%`, top: `${slot.y}%` }} onDragOver={event => event.preventDefault()} onDrop={event => assignPlayer(slot.id, event.dataTransfer.getData('playerId'))}>
          {slot.player ? <button type="button" className="pitch-player" title="Click to remove" onClick={() => removePlayer(slot.id)}><img src={slot.player.portraitUrl} alt="" onError={getImageFallback} /><span>{slot.player.name}</span><small>{slot.role}</small></button> : <div className="empty-slot"><strong>{slot.role}</strong><small>Drop player</small></div>}
        </div>)}
      </section>

      <aside className="planner-sidebar">
        <section className="section compact-section"><h2>Squad summary</h2><div className="stat-group"><Stat label="Players" value={`${summary.playerCount}/11`} /><Stat label="Total value" value={formatMarketValue(summary.totalValue)} /><Stat label="Average age" value={summary.averageAge ? summary.averageAge.toFixed(1) : 'N/A'} /><Stat label="Role issues" value={summary.missing.length + summary.mismatches.length} /></div>{summary.missing.length > 0 && <p className="planner-warning"><strong>Missing:</strong> {summary.missing.join(', ')}</p>}{summary.mismatches.length > 0 && <p className="planner-warning"><strong>Out of role:</strong> {summary.mismatches.map(slot => slot.player.name).join(', ')}</p>}</section>
        <section className="section compact-section"><h2>Available players</h2>{availablePlayers.length === 0 && <EmptyState title="No players available" message="Save targets to a shortlist or import a club squad above." />}<div className="planner-player-list">{availablePlayers.map(player => <article key={player.id} draggable onDragStart={event => event.dataTransfer.setData('playerId', player.id)}><img src={player.portraitUrl} alt="" onError={getImageFallback} /><div><strong>{player.name}</strong><small>{player.position || 'Unknown role'} · {formatMarketValue(player.marketValue)}</small></div><select aria-label={`Place ${player.name}`} defaultValue="" onChange={event => { if (event.target.value) assignPlayer(event.target.value, player.id); event.target.value = '' }}><option value="">Place…</option>{slots.filter(slot => !slot.player).map(slot => <option key={slot.id} value={slot.id}>{slot.role}</option>)}</select></article>)}</div></section>
      </aside>
    </div>

    {plans.length > 0 && <section className="section"><h2>Saved squad plans</h2><div className="saved-plan-grid">{plans.map(plan => <article key={plan.id}><div><strong>{plan.name}</strong><small>{plan.formation} · {plan.slots.filter(slot => slot.player).length}/11 players</small></div><button className="mini-button" onClick={() => loadPlan(plan)}>Load</button><button className="danger-link" onClick={() => deletePlan(plan.id)}>Delete</button></article>)}</div></section>}
  </div>
}

function Stat({ label, value }) { return <div className="stat-item"><div className="stat-value">{value}</div><div className="stat-label">{label}</div></div> }

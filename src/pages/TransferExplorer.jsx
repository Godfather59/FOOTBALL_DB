import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getPlayerTransfers, getPlayers, search } from '../api/client'
import { transferType } from '../api/recruitment'
import { formatDate, formatMarketValue, getImageFallback, isAbortError, mapWithConcurrency } from '../api/utils'
import { EmptyState, ErrorState, LoadingState } from '../components/StateMessage'

export default function TransferExplorer() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q') || ''
  const [query, setQuery] = useState(q)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({ season: '', type: '', direction: '', club: '', minFee: '', maxFee: '' })

  useEffect(() => setQuery(q), [q])
  useEffect(() => {
    if (!q) { setRows([]); return undefined }
    const controller = new AbortController(); setLoading(true); setError(null)
    async function loadTransfers() {
      try {
        const result = await search(q, { signal: controller.signal })
        const ids = (result.playerIds || []).slice(0, 30)
        const players = await getPlayers(ids, { signal: controller.signal })
        const transferEntries = await mapWithConcurrency(players || [], 4, async player => {
          try {
            const data = await getPlayerTransfers(player.id, { signal: controller.signal })
            return (data?.transfers || []).map((transfer, index) => ({ ...transfer, rowId: `${player.id}-${index}`, player }))
          } catch (transferError) { if (isAbortError(transferError)) throw transferError; return [] }
        }, controller.signal)
        setRows(transferEntries.flat())
      } catch (loadError) { if (!isAbortError(loadError)) setError(loadError.message) }
      finally { if (!controller.signal.aborted) setLoading(false) }
    }
    loadTransfers(); return () => controller.abort()
  }, [q])

  const seasons = useMemo(() => [...new Set(rows.map(row => row.seasonName).filter(Boolean))].sort().reverse(), [rows])
  const filtered = useMemo(() => rows.filter(row => {
    const fee = Number(row.transferFee || row.fee || 0)
    const clubs = `${row.fromClub?.name || ''} ${row.toClub?.name || ''}`.toLowerCase()
    if (filters.season && row.seasonName !== filters.season) return false
    if (filters.type && transferType(row) !== filters.type) return false
    if (filters.club && !clubs.includes(filters.club.toLowerCase())) return false
    if (filters.direction && filters.club) { const target = filters.club.toLowerCase(); const fromMatches = String(row.fromClub?.name || '').toLowerCase().includes(target); const toMatches = String(row.toClub?.name || '').toLowerCase().includes(target); if (filters.direction === 'Arrival' && !toMatches) return false; if (filters.direction === 'Departure' && !fromMatches) return false }
    if (filters.minFee && fee < Number(filters.minFee) * 1_000_000) return false
    if (filters.maxFee && fee > Number(filters.maxFee) * 1_000_000) return false
    return true
  }), [rows, filters])
  const totalFees = filtered.reduce((sum, row) => sum + Number(row.transferFee || row.fee || 0), 0)
  const loans = filtered.filter(row => transferType(row) === 'Loan').length
  const freeTransfers = filtered.filter(row => transferType(row) === 'Free transfer').length
  const targetClub = filters.club.toLowerCase()
  const arrivalFees = targetClub ? filtered.filter(row => String(row.toClub?.name || '').toLowerCase().includes(targetClub)).reduce((sum, row) => sum + Number(row.transferFee || row.fee || 0), 0) : 0
  const departureFees = targetClub ? filtered.filter(row => String(row.fromClub?.name || '').toLowerCase().includes(targetClub)).reduce((sum, row) => sum + Number(row.transferFee || row.fee || 0), 0) : 0
  const netSpend = arrivalFees - departureFees

  function submit(event) { event.preventDefault(); const value = query.trim(); if (value) setSearchParams({ q: value }) }
  function setFilter(key, value) { setFilters(current => ({ ...current, [key]: value })) }

  return <div>
    <div className="page-heading"><div><span className="eyebrow">Movement database</span><h1>Transfer explorer</h1></div><form className="search-box compact" onSubmit={submit}><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Player, club, league or nationality" /><button>Explore</button></form></div>
    <p className="result-summary">Search builds a transfer dataset from up to 30 exposed player profiles. Use the filters to analyze fees, loans, clubs and seasons.</p>
    {q && <section className="filter-panel"><div className="filter-grid"><label>Season<select value={filters.season} onChange={event => setFilter('season', event.target.value)}><option value="">All seasons</option>{seasons.map(season => <option key={season}>{season}</option>)}</select></label><label>Type<select value={filters.type} onChange={event => setFilter('type', event.target.value)}><option value="">All types</option>{['Permanent','Loan','Free transfer','Loan return','Unknown'].map(type => <option key={type}>{type}</option>)}</select></label><label>Direction<select value={filters.direction} onChange={event => setFilter('direction', event.target.value)}><option value="">All directions</option><option>Arrival</option><option>Departure</option></select></label><label>Club<input value={filters.club} onChange={event => setFilter('club', event.target.value)} placeholder="From or to club" /></label><label>Minimum fee (€m)<input type="number" min="0" value={filters.minFee} onChange={event => setFilter('minFee', event.target.value)} /></label><label>Maximum fee (€m)<input type="number" min="0" value={filters.maxFee} onChange={event => setFilter('maxFee', event.target.value)} /></label></div></section>}
    {loading && <LoadingState label="Collecting transfer histories…" />}{error && <ErrorState message={error} />}
    {!loading && q && rows.length === 0 && !error && <EmptyState title="No transfers exposed" message="Try a player name, club, competition or nationality." />}
    {filtered.length > 0 && <><section className="stat-group transfer-summary"><Stat label="Transfers" value={filtered.length} /><Stat label="Recorded fees" value={formatMarketValue(totalFees)} /><Stat label="Loans" value={loans} /><Stat label="Free transfers" value={freeTransfers} />{filters.club && <><Stat label="Recorded spending" value={formatMarketValue(arrivalFees)} /><Stat label="Recorded income" value={formatMarketValue(departureFees)} /><Stat label="Net spend" value={formatMarketValue(netSpend)} /></>}</section><section className="section"><h2>Transfer records</h2><div className="table-scroll"><table className="table transfer-table"><thead><tr><th>Player</th><th>Date</th><th>From</th><th>To</th><th>Type</th><th>Fee</th><th>Season</th></tr></thead><tbody>{filtered.map(row => <tr key={row.rowId}><td><button className="table-player-button" onClick={() => navigate(`/players/${row.player.id}`)}><img src={row.player.portraitUrl} alt="" onError={getImageFallback} /><span>{row.player.name}</span></button></td><td>{formatDate(row.date)}</td><td>{row.fromClub?.name || '-'}</td><td>{row.toClub?.name || '-'}</td><td>{transferType(row)}</td><td><strong>{row.transferFee ? formatMarketValue(row.transferFee) : '-'}</strong></td><td>{row.seasonName || '-'}</td></tr>)}</tbody></table></div></section></>}
  </div>
}

function Stat({ label, value }) { return <div className="stat-item"><div className="stat-value">{value}</div><div className="stat-label">{label}</div></div> }

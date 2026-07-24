import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDate, formatMarketValue, getImageFallback } from '../api/utils'
import { useWatchlist } from '../context/WatchlistContext'
import { EmptyState } from '../components/StateMessage'

export default function Watchlist() {
  const { items, folders, remove, clear, updateItem, addFolder, removeFolder } = useWatchlist()
  const navigate = useNavigate()
  const [selectedIds, setSelectedIds] = useState([])
  const [folderId, setFolderId] = useState('all')
  const [newFolder, setNewFolder] = useState('')
  const selected = useMemo(() => selectedIds.filter(id => items.some(item => item.id === id)), [selectedIds, items])
  const visible = folderId === 'all' ? items : items.filter(item => item.folderId === folderId)

  function toggleSelected(id) {
    setSelectedIds(current => current.includes(id) ? current.filter(value => value !== id) : current.length < 4 ? [...current, id] : current)
  }

  function createFolder(event) {
    event.preventDefault()
    const folder = addFolder(newFolder)
    if (folder) { setFolderId(folder.id); setNewFolder('') }
  }

  if (items.length === 0) return <EmptyState title="Your shortlists are empty" message="Save players from search, scouting or profile pages, then organize them into recruitment folders." />

  return <div>
    <div className="page-heading"><div><span className="eyebrow">Recruitment workspace</span><h1>Advanced shortlists</h1></div><div className="heading-actions"><button className="secondary-button" type="button" onClick={() => navigate('/squad-planner')}>Open squad planner</button><button className="secondary-button" type="button" onClick={clear}>Clear all</button><button className="primary-button" type="button" disabled={selected.length < 2} onClick={() => navigate(`/compare?ids=${selected.join(',')}`)}>Compare ({selected.length})</button></div></div>
    <p className="result-summary">Create folders, add notes and ratings, set recruitment status, and select up to four players for comparison.</p>

    <section className="shortlist-toolbar">
      <div className="folder-tabs"><button className={folderId === 'all' ? 'active' : ''} onClick={() => setFolderId('all')}>All ({items.length})</button>{folders.map(folder => <button key={folder.id} className={folderId === folder.id ? 'active' : ''} onClick={() => setFolderId(folder.id)}>{folder.name} ({items.filter(item => item.folderId === folder.id).length})</button>)}</div>
      <form className="folder-form" onSubmit={createFolder}><input value={newFolder} onChange={event => setNewFolder(event.target.value)} placeholder="New folder name" /><button className="mini-button">Add folder</button>{folderId !== 'all' && folderId !== 'general' && <button type="button" className="danger-link" onClick={() => { removeFolder(folderId); setFolderId('all') }}>Delete folder</button>}</form>
    </section>

    <div className="watchlist-grid">
      {visible.map(item => <article key={item.id} className={`watchlist-card ${selected.includes(item.id) ? 'selected' : ''}`}>
        <label className="compare-check"><input type="checkbox" checked={selected.includes(item.id)} disabled={!selected.includes(item.id) && selected.length >= 4} onChange={() => toggleSelected(item.id)} />Compare</label>
        <button className="watchlist-profile" type="button" onClick={() => navigate(`/players/${item.id}`)}><img src={item.portraitUrl} alt="" onError={getImageFallback} /><span><strong>{item.name}</strong><small>{item.position || 'Position unavailable'}{item.clubName ? ` · ${item.clubName}` : ''}</small></span></button>
        <div className="watchlist-meta"><span>{item.age != null ? `${item.age} years` : 'Age N/A'}</span><strong>{formatMarketValue(item.marketValue)}</strong><span>{item.contractEndDate ? `Contract: ${formatDate(item.contractEndDate)}` : 'Contract unknown'}</span></div>
        <div className="shortlist-fields">
          <label>Folder<select value={item.folderId || 'general'} onChange={event => updateItem(item.id, { folderId: event.target.value })}>{folders.map(folder => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select></label>
          <label>Priority<select value={item.priority || 'Medium'} onChange={event => updateItem(item.id, { priority: event.target.value })}><option>Low</option><option>Medium</option><option>High</option><option>Urgent</option></select></label>
          <label>Status<select value={item.status || 'Watching'} onChange={event => updateItem(item.id, { status: event.target.value })}><option>Watching</option><option>Contact</option><option>Negotiating</option><option>Approved</option><option>Rejected</option></select></label>
          <label>Estimated fee (€m)<input type="number" min="0" value={item.estimatedFee || ''} onChange={event => updateItem(item.id, { estimatedFee: event.target.value })} /></label><label>Rating<select value={item.rating || 0} onChange={event => updateItem(item.id, { rating: Number(event.target.value) })}><option value="0">Not rated</option>{[1,2,3,4,5].map(value => <option key={value} value={value}>{value}/5</option>)}</select></label>
          <label className="notes-field">Notes<textarea value={item.notes || ''} onChange={event => updateItem(item.id, { notes: event.target.value })} placeholder="Role, fee, concerns, next action…" /></label>
        </div>
        <div className="card-actions"><button className="mini-button" onClick={() => navigate(`/similar/${item.id}`)}>Similar</button><button className="mini-button" onClick={() => navigate(`/fit/${item.id}`)}>Club fit</button><button className="danger-link" onClick={() => remove(item.id)}>Remove</button></div>
      </article>)}
    </div>
  </div>
}

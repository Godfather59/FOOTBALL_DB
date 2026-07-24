import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDate, formatMarketValue, getImageFallback } from '../api/utils'
import { useWatchlist } from '../context/WatchlistContext'
import { EmptyState } from '../components/StateMessage'

export default function Watchlist() {
  const { items, remove, clear } = useWatchlist()
  const navigate = useNavigate()
  const [selectedIds, setSelectedIds] = useState([])
  const selected = useMemo(() => selectedIds.filter(id => items.some(item => item.id === id)), [selectedIds, items])

  function toggleSelected(id) {
    setSelectedIds(current => current.includes(id)
      ? current.filter(value => value !== id)
      : current.length < 4 ? [...current, id] : current)
  }

  if (items.length === 0) {
    return <EmptyState title="Your watchlist is empty" message="Save players from search results or profile pages, then return here to compare and monitor them." />
  }

  return (
    <div>
      <div className="page-heading">
        <div><span className="eyebrow">Saved locally</span><h1>Player watchlist</h1></div>
        <div className="heading-actions">
          <button className="secondary-button" type="button" onClick={clear}>Clear all</button>
          <button className="primary-button" type="button" disabled={selected.length < 2} onClick={() => navigate(`/compare?ids=${selected.join(',')}`)}>Compare selected ({selected.length})</button>
        </div>
      </div>
      <p className="result-summary">Select between two and four players for a side-by-side comparison. Your list is stored in this browser.</p>

      <div className="watchlist-grid">
        {items.map(item => (
          <article key={item.id} className={`watchlist-card ${selected.includes(item.id) ? 'selected' : ''}`}>
            <label className="compare-check">
              <input type="checkbox" checked={selected.includes(item.id)} disabled={!selected.includes(item.id) && selected.length >= 4} onChange={() => toggleSelected(item.id)} />
              Compare
            </label>
            <button className="watchlist-profile" type="button" onClick={() => navigate(`/players/${item.id}`)}>
              <img src={item.portraitUrl} alt="" onError={getImageFallback} />
              <span><strong>{item.name}</strong><small>{item.position || 'Position unavailable'}{item.clubName ? ` · ${item.clubName}` : ''}</small></span>
            </button>
            <div className="watchlist-meta">
              <span>{item.age != null ? `${item.age} years` : 'Age N/A'}</span>
              <strong>{formatMarketValue(item.marketValue)}</strong>
              <span>{item.contractEndDate ? `Contract: ${formatDate(item.contractEndDate)}` : 'Contract unknown'}</span>
            </div>
            <button className="danger-link" type="button" onClick={() => remove(item.id)}>Remove</button>
          </article>
        ))}
      </div>
    </div>
  )
}

import { useWatchlist } from '../context/WatchlistContext'

export default function WatchlistButton({ player, compact = false, className = '' }) {
  const { has, toggle } = useWatchlist()
  const saved = has(player?.id)

  return (
    <button
      type="button"
      className={`watchlist-button ${saved ? 'saved' : ''} ${compact ? 'compact' : ''} ${className}`.trim()}
      onClick={event => {
        event.stopPropagation()
        toggle(player)
      }}
      aria-pressed={saved}
    >
      <span aria-hidden="true">{saved ? '★' : '☆'}</span>
      {compact ? (saved ? 'Saved' : 'Save') : (saved ? 'Remove from watchlist' : 'Add to watchlist')}
    </button>
  )
}

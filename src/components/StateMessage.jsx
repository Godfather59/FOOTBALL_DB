export function LoadingState({ label = 'Loading football data…' }) {
  return (
    <div className="loading" role="status" aria-live="polite">
      <div className="spinner" />
      <span>{label}</span>
    </div>
  )
}

export function CardSkeletonGrid({ count = 6 }) {
  return (
    <div className="card-grid" aria-label="Loading results">
      {Array.from({ length: count }, (_, index) => (
        <div className="card skeleton-card" key={index}>
          <div className="skeleton-avatar" />
          <div className="skeleton-lines">
            <div className="skeleton-line wide" />
            <div className="skeleton-line" />
            <div className="skeleton-line short" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="state-panel error-panel" role="alert">
      <div className="state-icon">!</div>
      <h3>Unable to load data</h3>
      <p>{message || 'The football data service is temporarily unavailable.'}</p>
      {onRetry && <button className="primary-button" onClick={onRetry}>Try again</button>}
    </div>
  )
}

export function EmptyState({ title = 'No results found', message }) {
  return (
    <div className="state-panel">
      <div className="state-icon">⌕</div>
      <h3>{title}</h3>
      {message && <p>{message}</p>}
    </div>
  )
}

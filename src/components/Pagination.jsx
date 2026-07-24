export default function Pagination({ page, pageCount, onPageChange }) {
  if (pageCount <= 1) return null

  return (
    <nav className="pagination" aria-label="Search result pages">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
      >
        ← Previous
      </button>
      <span>Page <strong>{page}</strong> of <strong>{pageCount}</strong></span>
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= pageCount}
      >
        Next →
      </button>
    </nav>
  )
}

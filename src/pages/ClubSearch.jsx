import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getClubs, search } from '../api/client'
import { formatMarketValue, getImageFallback, isAbortError, parsePositiveInt } from '../api/utils'
import Pagination from '../components/Pagination'
import { CardSkeletonGrid, EmptyState, ErrorState } from '../components/StateMessage'

const PAGE_SIZE = 20

export default function ClubSearch() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const q = searchParams.get('q')?.trim() || ''
  const requestedPage = parsePositiveInt(searchParams.get('page'), 1)

  const [query, setQuery] = useState(q)
  const [clubs, setClubs] = useState([])
  const [availableIds, setAvailableIds] = useState([])
  const [reportedTotal, setReportedTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => setQuery(q), [q])

  const pageCount = Math.max(1, Math.ceil(availableIds.length / PAGE_SIZE))
  const page = Math.min(requestedPage, pageCount)

  useEffect(() => {
    if (!q) {
      setClubs([])
      setAvailableIds([])
      setReportedTotal(0)
      return undefined
    }

    const controller = new AbortController()

    async function loadClubs() {
      setLoading(true)
      setError(null)
      try {
        const result = await search(q, { signal: controller.signal, bypassCache: retryKey > 0 })
        const ids = result.clubIds || []
        const nextPageCount = Math.max(1, Math.ceil(ids.length / PAGE_SIZE))
        const safePage = Math.min(requestedPage, nextPageCount)
        const start = (safePage - 1) * PAGE_SIZE
        const profiles = await getClubs(ids.slice(start, start + PAGE_SIZE), {
          signal: controller.signal,
          bypassCache: retryKey > 0
        })

        setAvailableIds(ids)
        setReportedTotal(result.totalCount?.clubs || ids.length)
        setClubs(Array.isArray(profiles) ? profiles : [])

        if (safePage !== requestedPage) {
          setSearchParams({ q, page: String(safePage) }, { replace: true })
        }
      } catch (loadError) {
        if (!isAbortError(loadError)) setError(loadError.message)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    loadClubs()
    return () => controller.abort()
  }, [q, requestedPage, retryKey, setSearchParams])

  function handleSearch(event) {
    event.preventDefault()
    const value = query.trim()
    if (!value) return
    setSearchParams({ q: value, page: '1' })
  }

  function handlePageChange(nextPage) {
    setSearchParams({ q, page: String(nextPage) })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!q) {
    return (
      <section className="search-section">
        <span className="eyebrow">Club database</span>
        <h1>Search clubs</h1>
        <p>Find squads, stadium information and club market values.</p>
        <form className="search-box" onSubmit={handleSearch}>
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Club name…" aria-label="Club name" />
          <button type="submit">Search</button>
        </form>
      </section>
    )
  }

  return (
    <div>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Club database</span>
          <h1>Club results</h1>
        </div>
        <form className="search-box compact" onSubmit={handleSearch}>
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Club name…" aria-label="Club name" />
          <button type="submit">Search</button>
        </form>
      </div>

      <p className="result-summary">
        Results for <strong>“{q}”</strong> · {reportedTotal} reported
        {availableIds.length < reportedTotal && ` · ${availableIds.length} profiles available from the provider`}
      </p>

      {error && <ErrorState message={error} onRetry={() => setRetryKey(key => key + 1)} />}
      {loading && <CardSkeletonGrid />}

      {!loading && !error && clubs.length > 0 && (
        <>
          <div className="card-grid">
            {clubs.map(club => (
              <article key={club.id} className="card result-card" onClick={() => navigate(`/clubs/${club.id}`)}>
                <img className="club-crest" src={club.crestUrl} alt="" onError={getImageFallback} />
                <div className="card-content">
                  <h2>{club.name}</h2>
                  <p>{club.baseDetails?.shortName || club.baseDetails?.primaryCompetitionId || 'Club profile'}</p>
                  <div className="card-meta">
                    {club.squadDetails?.squadSize != null && <span>{club.squadDetails.squadSize} players</span>}
                    {club.squadDetails?.averageAge != null && <span>Average age {club.squadDetails.averageAge}</span>}
                  </div>
                  <strong className="card-price">{formatMarketValue(club.squadDetails?.totalMarketValue)}</strong>
                </div>
              </article>
            ))}
          </div>
          <Pagination page={page} pageCount={pageCount} onPageChange={handlePageChange} />
        </>
      )}

      {!loading && !error && clubs.length === 0 && (
        <EmptyState title="No clubs found" message="Try another spelling or search using the full club name." />
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getClubs, getCompetition, search } from '../api/client'
import { normalizeCompetition, searchKnownCompetitions } from '../api/competitionCatalog'
import { isAbortError, mapWithConcurrency, uniqueBy } from '../api/utils'
import { CardSkeletonGrid, EmptyState, ErrorState } from '../components/StateMessage'

export default function CompetitionSearch() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const q = searchParams.get('q')?.trim() || ''

  const [query, setQuery] = useState(q)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => setQuery(q), [q])

  useEffect(() => {
    if (!q) {
      setResults([])
      return undefined
    }

    const controller = new AbortController()

    async function loadCompetitions() {
      setLoading(true)
      setError(null)
      try {
        const knownMatches = searchKnownCompetitions(q)
        const searchResult = await search(q, {
          signal: controller.signal,
          bypassCache: retryKey > 0
        })

        const clubProfiles = searchResult.clubIds?.length
          ? await getClubs(searchResult.clubIds.slice(0, 20), { signal: controller.signal })
          : []

        const discoveredCodes = [
          ...(searchResult.competitionIds || []),
          ...clubProfiles.map(club => club.baseDetails?.primaryCompetitionId).filter(Boolean),
          ...knownMatches.map(item => item.code)
        ]

        const uniqueCodes = [...new Set(discoveredCodes.map(code => String(code).toUpperCase()))].slice(0, 30)
        const fetched = await mapWithConcurrency(
          uniqueCodes,
          5,
          async code => {
            try {
              const competition = await getCompetition(code, { signal: controller.signal })
              return normalizeCompetition(competition, code)
            } catch (competitionError) {
              if (isAbortError(competitionError)) throw competitionError
              return normalizeCompetition(null, code)
            }
          },
          controller.signal
        )

        const normalizedKnown = knownMatches.map(item => normalizeCompetition(item, item.code))
        setResults(uniqueBy([...fetched, ...normalizedKnown], item => item.code))
      } catch (loadError) {
        if (!isAbortError(loadError)) setError(loadError.message)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    loadCompetitions()
    return () => controller.abort()
  }, [q, retryKey])

  function handleSearch(event) {
    event.preventDefault()
    const value = query.trim()
    if (!value) return
    setSearchParams({ q: value })
  }

  if (!q) {
    return (
      <section className="search-section">
        <span className="eyebrow">Competition database</span>
        <h1>Search competitions</h1>
        <p>Find domestic leagues and international tournaments by name or code.</p>
        <form className="search-box" onSubmit={handleSearch}>
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Competition name…" aria-label="Competition name" />
          <button type="submit">Search</button>
        </form>
      </section>
    )
  }

  return (
    <div>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Competition database</span>
          <h1>Competition results</h1>
        </div>
        <form className="search-box compact" onSubmit={handleSearch}>
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Competition name…" aria-label="Competition name" />
          <button type="submit">Search</button>
        </form>
      </div>

      <p className="result-summary">Results for <strong>“{q}”</strong></p>
      {error && <ErrorState message={error} onRetry={() => setRetryKey(key => key + 1)} />}
      {loading && <CardSkeletonGrid count={4} />}

      {!loading && !error && results.length > 0 && (
        <div className="card-grid competition-grid">
          {results.map(competition => (
            <article
              key={competition.code}
              className="card competition-card"
              onClick={() => navigate(`/competitions/${competition.code}`)}
            >
              <div className="competition-code">{competition.code}</div>
              <div className="card-content">
                <h2>{competition.name}</h2>
                <p>{competition.country || 'International competition'}</p>
                <span className="text-link">View competition →</span>
              </div>
            </article>
          ))}
        </div>
      )}

      {!loading && !error && results.length === 0 && (
        <EmptyState title="No competitions found" message="Try a league name such as Premier League, Botola Pro, LaLiga or Champions League." />
      )}
    </div>
  )
}

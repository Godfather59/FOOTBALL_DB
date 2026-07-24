import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { search, getClubs } from '../api/client'
import { formatMarketValue, getImageFallback } from '../api/utils'

export default function ClubSearch() {
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [clubs, setClubs] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const q = searchParams.get('q') || ''

  const doSearch = useCallback(async () => {
    if (!q) return
    setLoading(true)
    setError(null)
    try {
      const searchResult = await search(q)
      const ids = searchResult.clubIds.slice(0, 20)
      setTotal(searchResult.totalCount?.clubs || ids.length)
      if (ids.length > 0) {
        const profs = await getClubs(ids)
        setClubs(profs)
      } else {
        setClubs([])
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [q])

  useEffect(() => { doSearch() }, [doSearch])

  function handleSearch(e) {
    e.preventDefault()
    if (!query.trim()) return
    navigate(`/clubs?q=${encodeURIComponent(query.trim())}`)
  }

  if (!q) {
    return (
      <div className="search-section">
        <h2>Search Clubs</h2>
        <p>Find clubs and teams from any league</p>
        <form className="search-box" onSubmit={handleSearch}>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Club name..." />
          <button type="submit">Search</button>
        </form>
      </div>
    )
  }

  return (
    <div>
      <form className="search-box" onSubmit={handleSearch} style={{ marginBottom: 20 }}>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Club name..." />
        <button type="submit">Search</button>
      </form>

      <p style={{ marginBottom: 12, color: '#777' }}>Results for &ldquo;{q}&rdquo; — {total} found</p>

      {loading && <div className="loading"><div className="spinner" /></div>}
      {error && <div className="error">{error}</div>}

      <div className="card-grid">
        {clubs.map(c => (
          <div key={c.id} className="card" onClick={() => navigate(`/clubs/${c.id}`)}>
            <div style={{ display: 'flex', padding: 12, gap: 12 }}>
              <img
                src={c.crestUrl}
                alt={c.name}
                style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'contain', background: '#f5f5f5' }}
                onError={getImageFallback}
              />
              <div style={{ flex: 1 }}>
                <div className="card-title">{c.name}</div>
                <div className="card-subtitle">{c.baseDetails?.shortName || c.name}</div>
                {c.squadDetails && (
                  <div className="card-detail">{c.squadDetails.squadSize} players · Avg age {c.squadDetails.averageAge}</div>
                )}
                <div className="card-footer">
                  <span className="card-price">{formatMarketValue(c.squadDetails?.totalMarketValue)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

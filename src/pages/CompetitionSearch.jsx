import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { search, getClubs } from '../api/client'
import { getImageFallback } from '../api/utils'

const COMPETITION_CODES = {
  'premier': 'GB1', 'epl': 'GB1', 'premier league': 'GB1',
  'bundesliga': 'L1', 'ligue 1': 'FR1', 'serie a': 'IT1', 'la liga': 'ES1',
  'champions league': 'CL', 'europa league': 'EL'
}

export default function CompetitionSearch() {
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [results, setResults] = useState([])
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
      const compIds = searchResult.competitionIds || []
      const clubIds = searchResult.clubIds || []
      const data = []
      if (compIds.length) {
        data.push(...compIds.map(id => ({ id, name: `Competition ${id}`, type: 'competition' })))
      }
      if (clubIds.length) {
        const clubs = await getClubs(clubIds.slice(0, 20))
        clubs.forEach(c => {
          if (c.baseDetails?.primaryCompetitionId) {
            data.push({
              id: c.baseDetails.primaryCompetitionId,
              name: `League from ${c.name}`,
              type: 'competition',
              code: c.baseDetails.primaryCompetitionId
            })
          }
        })
      }
      const known = Object.entries(COMPETITION_CODES)
        .filter(([name]) => q.toLowerCase().includes(name) || name.includes(q.toLowerCase()))
        .map(([name, code]) => ({ id: code, name, type: 'competition', code }))
      data.push(...known.filter(k => !data.some(d => d.code === k.code || d.id === k.id)))
      setResults(data.length ? data : known.length ? known : [{ id: q.toUpperCase(), name: q, type: 'competition', code: q.toUpperCase() }])
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
    navigate(`/competitions?q=${encodeURIComponent(query.trim())}`)
  }

  if (!q) {
    return (
      <div className="search-section">
        <h2>Search Competitions</h2>
        <p>Find leagues and tournaments worldwide</p>
        <form className="search-box" onSubmit={handleSearch}>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Competition name..." />
          <button type="submit">Search</button>
        </form>
      </div>
    )
  }

  return (
    <div>
      <form className="search-box" onSubmit={handleSearch} style={{ marginBottom: 20 }}>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Competition name..." />
        <button type="submit">Search</button>
      </form>

      <p style={{ marginBottom: 12, color: '#777' }}>Results for &ldquo;{q}&rdquo;</p>

      {loading && <div className="loading"><div className="spinner" /></div>}
      {error && <div className="error">{error}</div>}

      <div className="card-grid">
        {results.map((r, i) => (
          <div key={i} className="card" onClick={() => navigate(`/competitions/${r.code || r.id}`)}>
            <div className="card-body">
              <div className="card-title">{r.name}</div>
              <div className="card-subtitle">{r.type} · {r.code || r.id}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

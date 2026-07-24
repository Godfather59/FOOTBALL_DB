import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { search, getPlayers, getPlayerStatsByCompetition } from '../api/client'
import { formatMarketValue, getPositionName, getImageFallback, getClubFromAssignments } from '../api/utils'

export default function PlayerSearch() {
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [players, setPlayers] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const [filters, setFilters] = useState({
    name: '', position: '', minAge: '', maxAge: '', minValue: '', maxValue: '',
    minGoals: '', minAssists: '', clubName: ''
  })
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [playerStats, setPlayerStats] = useState({})
  const [loadingStats, setLoadingStats] = useState(false)

  const q = searchParams.get('q') || ''

  const doSearch = useCallback(async () => {
    if (!q) return
    setLoading(true)
    setError(null)
    setPlayerStats({})
    try {
      const searchResult = await search(q)
      const ids = searchResult.playerIds.slice(0, 20)
      setTotal(searchResult.totalCount?.players || ids.length)
      if (ids.length > 0) {
        const profs = await getPlayers(ids)
        setPlayers(profs)
      } else {
        setPlayers([])
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [q])

  useEffect(() => { doSearch() }, [doSearch])

  useEffect(() => {
    if (!showAdvanced || players.length === 0) return
    setLoadingStats(true)
    const statsMap = {}
    Promise.allSettled(
      players.map(p =>
        getPlayerStatsByCompetition(p.id)
          .then(data => {
            const total = (data.performances || []).reduce((acc, perf) => ({
              goals: acc.goals + (perf.goalsScored || 0),
              assists: acc.assists + (perf.assists || 0)
            }), { goals: 0, assists: 0 })
            statsMap[p.id] = total
          })
          .catch(() => {})
      )
    ).then(() => {
      setPlayerStats(statsMap)
      setLoadingStats(false)
    })
  }, [showAdvanced, players])

  const positions = useMemo(() => {
    const set = new Set()
    players.forEach(p => {
      const pos = getPositionName(p.attributes?.position)
      if (pos) set.add(pos)
    })
    return [...set].sort()
  }, [players])

  const filteredPlayers = useMemo(() => {
    return players.filter(p => {
      if (filters.name) {
        const n = filters.name.toLowerCase()
        if (!p.name.toLowerCase().includes(n)) return false
      }
      if (filters.position) {
        if (getPositionName(p.attributes?.position) !== filters.position) return false
      }
      if (filters.minAge || filters.maxAge) {
        const age = p.lifeDates?.age
        if (age == null) return false
        if (filters.minAge && age < Number(filters.minAge)) return false
        if (filters.maxAge && age > Number(filters.maxAge)) return false
      }
      if (filters.minValue || filters.maxValue) {
        const val = p.marketValueDetails?.current?.value
        if (val == null) return false
        if (filters.minValue && val < Number(filters.minValue) * 1000000) return false
        if (filters.maxValue && val > Number(filters.maxValue) * 1000000) return false
      }
      if (filters.clubName) {
        const term = filters.clubName.toLowerCase()
        const club = getClubFromAssignments(p.clubAssignments)
        if (!club || !String(club.clubId).includes(term)) return false
      }
      if (showAdvanced && (filters.minGoals || filters.minAssists)) {
        const stats = playerStats[p.id]
        if (!stats) return false
        if (filters.minGoals && (stats.goals || 0) < Number(filters.minGoals)) return false
        if (filters.minAssists && (stats.assists || 0) < Number(filters.minAssists)) return false
      }
      return true
    })
  }, [players, filters, showAdvanced, playerStats])

  function handleSearch(e) {
    e.preventDefault()
    if (!query.trim()) return
    navigate(`/players?q=${encodeURIComponent(query.trim())}`)
  }

  function setFilter(key, value) {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  if (!q) {
    return (
      <div className="search-section">
        <h2>Search Players</h2>
        <p>Find any footballer in the world</p>
        <form className="search-box" onSubmit={handleSearch}>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Player name..." />
          <button type="submit">Search</button>
        </form>
      </div>
    )
  }

  return (
    <div>
      <form className="search-box" onSubmit={handleSearch} style={{ marginBottom: 16 }}>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Player name..." />
        <button type="submit">Search</button>
      </form>

      <p style={{ marginBottom: 12, color: '#777' }}>Results for &ldquo;{q}&rdquo; — {total} found{filteredPlayers.length < players.length ? ` (${filteredPlayers.length} shown)` : ''}</p>

      {loading && <div className="loading"><div className="spinner" /></div>}
      {error && <div className="error">{error}</div>}

      {!loading && !error && players.length > 0 && (
        <>
          <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                placeholder="Name"
                value={filters.name}
                onChange={e => setFilter('name', e.target.value)}
                style={inputStyle}
              />
              <select value={filters.position} onChange={e => setFilter('position', e.target.value)} style={inputStyle}>
                <option value="">All positions</option>
                {positions.map(pos => <option key={pos} value={pos}>{pos}</option>)}
              </select>
              <input
                placeholder="Min age"
                type="number" min="0" max="50"
                value={filters.minAge}
                onChange={e => setFilter('minAge', e.target.value)}
                style={{ ...inputStyle, width: 80 }}
              />
              <input
                placeholder="Max age"
                type="number" min="0" max="50"
                value={filters.maxAge}
                onChange={e => setFilter('maxAge', e.target.value)}
                style={{ ...inputStyle, width: 80 }}
              />
              <input
                placeholder="Min value (€M)"
                type="number" min="0"
                value={filters.minValue}
                onChange={e => setFilter('minValue', e.target.value)}
                style={{ ...inputStyle, width: 130 }}
              />
              <input
                placeholder="Max value (€M)"
                type="number" min="0"
                value={filters.maxValue}
                onChange={e => setFilter('maxValue', e.target.value)}
                style={{ ...inputStyle, width: 130 }}
              />
            </div>

            <div style={{ marginTop: 8 }}>
              <label style={{ cursor: 'pointer', fontSize: 14, color: 'var(--primary)', fontWeight: 600 }}>
                <input type="checkbox" checked={showAdvanced} onChange={e => setShowAdvanced(e.target.checked)} />
                {' '}Advanced stats (goals / assists)
              </label>
            </div>

            {showAdvanced && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 8 }}>
                <input
                  placeholder="Min goals"
                  type="number" min="0"
                  value={filters.minGoals}
                  onChange={e => setFilter('minGoals', e.target.value)}
                  style={{ ...inputStyle, width: 100 }}
                />
                <input
                  placeholder="Min assists"
                  type="number" min="0"
                  value={filters.minAssists}
                  onChange={e => setFilter('minAssists', e.target.value)}
                  style={{ ...inputStyle, width: 100 }}
                />
                {loadingStats && <span style={{ fontSize: 13, color: '#777' }}>Fetching stats...</span>}
              </div>
            )}
          </div>

          <div className="card-grid">
            {filteredPlayers.map(p => {
              const club = getClubFromAssignments(p.clubAssignments)
              const stats = playerStats[p.id]
              return (
                <div key={p.id} className="card" onClick={() => navigate(`/players/${p.id}`)}>
                  <div style={{ display: 'flex', padding: 12, gap: 12 }}>
                    <img
                      src={p.portraitUrl}
                      alt={p.name}
                      style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover' }}
                      onError={getImageFallback}
                    />
                    <div style={{ flex: 1 }}>
                      <div className="card-title">{p.name}</div>
                      <div className="card-subtitle">{getPositionName(p.attributes?.position)}</div>
                      <div className="card-detail">{p.lifeDates?.age} yrs</div>
                      {showAdvanced && stats && (
                        <div className="card-detail" style={{ fontWeight: 600, color: 'var(--primary)' }}>
                          {stats.goals} goals / {stats.assists} assists
                        </div>
                      )}
                      <div className="card-footer">
                        <span className="card-price">{formatMarketValue(p.marketValueDetails?.current?.value)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {filteredPlayers.length === 0 && !loading && (
            <p style={{ textAlign: 'center', color: '#777', marginTop: 40 }}>No players match your filters</p>
          )}
        </>
      )}
    </div>
  )
}

const inputStyle = {
  padding: '8px 12px',
  border: '1px solid #ddd',
  borderRadius: 8,
  fontSize: 13,
  outline: 'none',
  background: '#fafafa'
}

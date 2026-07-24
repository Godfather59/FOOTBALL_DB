import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getClub, getClubSquad, getClubStadium } from '../api/client'
import { formatMarketValue, formatDate, getImageFallback } from '../api/utils'

export default function ClubDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [club, setClub] = useState(null)
  const [squad, setSquad] = useState(null)
  const [stadium, setStadium] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    Promise.allSettled([
      getClub(id).catch(() => null),
      getClubSquad(id).catch(() => null),
      getClubStadium(id).catch(() => null)
    ]).then(([cR, sR, stR]) => {
      if (cR.status === 'rejected') throw new Error('Club not found')
      setClub(cR.value)
      setSquad(sR.status === 'fulfilled' ? sR.value : null)
      setStadium(stR.status === 'fulfilled' ? stR.value : null)
    }).catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="loading"><div className="spinner" /></div>
  if (error) return <div className="error">{error}</div>
  if (!club) return null

  const c = club
  const d = c.baseDetails || {}
  const sd = c.squadDetails || {}

  return (
    <div>
      <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', marginBottom: 12, color: 'var(--primary)', fontWeight: 600 }}>&larr; Back</button>

      <div className="player-header">
        <img src={c.crestUrl} alt={c.name} onError={getImageFallback} style={{ width: 96, height: 96, objectFit: 'contain', background: '#f0f0f0' }} />
        <div>
          <h2>{c.name}</h2>
          {d.shortName && d.shortName !== c.name && <p style={{ color: '#777' }}>{d.shortName}</p>}
          <div className="player-meta">
            {d.primaryCompetitionId && <span className="accent-badge">{d.primaryCompetitionId}</span>}
          </div>
          <div style={{ display: 'flex', gap: 24, marginTop: 12 }}>
            <div><strong>{sd.squadSize || 0}</strong> <span style={{ color: '#777' }}>Squad</span></div>
            {sd.averageAge && <div><strong>{sd.averageAge}</strong> <span style={{ color: '#777' }}>Avg Age</span></div>}
            <div><strong>{formatMarketValue(sd.totalMarketValue)}</strong> <span style={{ color: '#777' }}>Total Value</span></div>
          </div>
        </div>
      </div>

      {stadium && (
        <div className="section">
          <h3>Stadium</h3>
          <p><strong>Name:</strong> {stadium.stadiumName || stadium.name || 'N/A'}</p>
          {stadium.capacity && <p><strong>Capacity:</strong> {stadium.capacity.toLocaleString()}</p>}
          {stadium.city && <p><strong>City:</strong> {stadium.city}</p>}
          {stadium.openingDate && <p><strong>Opened:</strong> {formatDate(stadium.openingDate)}</p>}
        </div>
      )}

      <div className="section">
        <h3>Squad Details</h3>
        <div className="stat-group">
          {sd.squadSize != null && (
            <div className="stat-item">
              <div className="stat-value">{sd.squadSize}</div>
              <div className="stat-label">Squad Size</div>
            </div>
          )}
          {sd.averageAge != null && (
            <div className="stat-item">
              <div className="stat-value">{sd.averageAge}</div>
              <div className="stat-label">Avg Age</div>
            </div>
          )}
          {sd.foreignCount != null && (
            <div className="stat-item">
              <div className="stat-value">{sd.foreignCount}</div>
              <div className="stat-label">Foreigners</div>
            </div>
          )}
          {sd.nationalCount != null && (
            <div className="stat-item">
              <div className="stat-value">{sd.nationalCount}</div>
              <div className="stat-label">National Team Players</div>
            </div>
          )}
          {sd.totalMarketValue != null && (
            <div className="stat-item">
              <div className="stat-value">{formatMarketValue(sd.totalMarketValue)}</div>
              <div className="stat-label">Total Market Value</div>
            </div>
          )}
        </div>
      </div>

      {squad?.squad?.length > 0 && (
        <div className="section">
          <h3>Squad ({squad.squad.length} players)</h3>
          <table className="table">
            <thead><tr><th>Player</th><th>Position</th><th>#</th><th>Type</th></tr></thead>
            <tbody>
              {squad.squad.map((p, i) => (
                <tr key={p.playerId || i} onClick={() => p.playerId && navigate(`/players/${p.playerId}`)} style={{ cursor: p.playerId ? 'pointer' : 'default' }}>
                  <td style={{ fontWeight: 600 }}>Player #{p.playerId}</td>
                  <td>{p.type || '-'}</td>
                  <td>{p.shirtNumber || '-'}</td>
                  <td>{p.isCaptain ? 'Captain' : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

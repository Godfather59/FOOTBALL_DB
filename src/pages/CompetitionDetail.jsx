import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getCompetition, getCompetitionTable } from '../api/client'
import { formatMarketValue } from '../api/utils'

export default function CompetitionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [comp, setComp] = useState(null)
  const [table, setTable] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    Promise.allSettled([
      getCompetition(id).catch(() => null),
      getCompetitionTable(id).catch(() => null)
    ]).then(([cR, tR]) => {
      if (cR.status === 'rejected') throw new Error('Competition not found')
      setComp(cR.value)
      setTable(tR.status === 'fulfilled' ? tR.value : null)
    }).catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="loading"><div className="spinner" /></div>
  if (error) return <div className="error">{error}</div>
  if (!comp) return null

  const c = comp

  return (
    <div>
      <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', marginBottom: 12, color: 'var(--primary)', fontWeight: 600 }}>&larr; Back</button>

      <div className="player-header" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
        <h2>{c.name}</h2>
        <p style={{ color: '#777' }}>
          {c.shortName && <>{c.shortName} · </>}
          Season: {c.currentSeasonId || 'N/A'}
        </p>
        {c.baseDetails && (
          <div style={{ display: 'flex', gap: 24, marginTop: 12 }}>
            <div><strong>{c.baseDetails.gameDayCount || '-'}</strong> <span style={{ color: '#777' }}>Matchdays</span></div>
          </div>
        )}
      </div>

      {table?.table?.length > 0 && (
        <div className="section">
          <h3>Standings</h3>
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Club</th>
                <th>P</th>
                <th>W</th>
                <th>D</th>
                <th>L</th>
                <th>GF</th>
                <th>GA</th>
                <th>GD</th>
                <th>Pts</th>
              </tr>
            </thead>
            <tbody>
              {table.table.map((row, i) => (
                <tr key={row.clubId || i}>
                  <td>{row.position || row.rank || i + 1}</td>
                  <td style={{ fontWeight: 600 }}>
                    {row.clubName || row.club || `Club #${row.clubId}`}
                  </td>
                  <td>{row.playedGames || row.played || '-'}</td>
                  <td>{row.won || row.wins || '-'}</td>
                  <td>{row.draw || row.draws || '-'}</td>
                  <td>{row.lost || row.losses || '-'}</td>
                  <td>{row.goalsFor || row.goals || '-'}</td>
                  <td>{row.goalsAgainst || '-'}</td>
                  <td>{row.goalDifference || row.goalDiff || '-'}</td>
                  <td style={{ fontWeight: 700 }}>{row.points || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(!table?.table || table.table.length === 0) && (
        <div className="section">
          <h3>Raw Data</h3>
          <pre className="json">{JSON.stringify(c, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}

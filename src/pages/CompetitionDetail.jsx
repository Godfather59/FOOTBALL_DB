import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getCompetition, getCompetitionTable } from '../api/client'
import { normalizeCompetition } from '../api/competitionCatalog'
import { isAbortError } from '../api/utils'
import { EmptyState, ErrorState, LoadingState } from '../components/StateMessage'

export default function CompetitionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [competition, setCompetition] = useState(null)
  const [standings, setStandings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadCompetition() {
      setLoading(true)
      setError(null)
      const options = { signal: controller.signal, bypassCache: retryKey > 0 }
      try {
        const [competitionResult, tableResult] = await Promise.allSettled([
          getCompetition(id, options),
          getCompetitionTable(id, options)
        ])

        if (competitionResult.status === 'rejected' || !competitionResult.value) {
          throw competitionResult.reason || new Error('Competition not found')
        }

        const tableData = tableResult.status === 'fulfilled' ? tableResult.value : null
        setCompetition(normalizeCompetition(competitionResult.value, id))
        setStandings(tableData?.table || tableData?.standings || [])
      } catch (loadError) {
        if (!isAbortError(loadError)) setError(loadError.message || 'Competition not found')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    loadCompetition()
    return () => controller.abort()
  }, [id, retryKey])

  if (loading) return <LoadingState label="Loading competition…" />
  if (error) return <ErrorState message={error} onRetry={() => setRetryKey(key => key + 1)} />
  if (!competition) return <EmptyState title="Competition not found" />

  return (
    <div>
      <button className="back-button" onClick={() => navigate(-1)}>← Back</button>

      <section className="competition-hero">
        <div className="competition-code large">{competition.code}</div>
        <div>
          <span className="eyebrow">Competition</span>
          <h1>{competition.name}</h1>
          <p>{competition.country || 'International'}{competition.currentSeasonId && ` · Season ${competition.currentSeasonId}`}</p>
        </div>
      </section>

      <section className="section">
        <h2>Standings</h2>
        {standings.length > 0 ? (
          <div className="table-scroll">
            <table className="table standings-table">
              <thead><tr><th>#</th><th>Club</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th></tr></thead>
              <tbody>
                {standings.map((row, index) => (
                  <tr key={row.clubId || index} className={row.clubId ? 'clickable-row' : ''} onClick={() => row.clubId && navigate(`/clubs/${row.clubId}`)}>
                    <td>{row.position || row.rank || index + 1}</td>
                    <td><strong>{row.clubName || row.club || `Club #${row.clubId}`}</strong></td>
                    <td>{row.playedGames ?? row.played ?? '-'}</td>
                    <td>{row.won ?? row.wins ?? '-'}</td>
                    <td>{row.draw ?? row.draws ?? '-'}</td>
                    <td>{row.lost ?? row.losses ?? '-'}</td>
                    <td>{row.goalsFor ?? row.goals ?? '-'}</td>
                    <td>{row.goalsAgainst ?? '-'}</td>
                    <td>{row.goalDifference ?? row.goalDiff ?? '-'}</td>
                    <td><strong>{row.points ?? '-'}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState title="No standings available" message="This may be a knockout competition or the provider has not published a table." />}
      </section>
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getClub, getClubSquad, getClubStadium, getPlayers } from '../api/client'
import { formatDate, formatMarketValue, getImageFallback, getPositionName, isAbortError } from '../api/utils'
import { EmptyState, ErrorState, LoadingState } from '../components/StateMessage'

export default function ClubDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [club, setClub] = useState(null)
  const [squad, setSquad] = useState([])
  const [players, setPlayers] = useState([])
  const [stadium, setStadium] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadClub() {
      setLoading(true)
      setError(null)
      const options = { signal: controller.signal, bypassCache: retryKey > 0 }
      try {
        const [clubResult, squadResult, stadiumResult] = await Promise.allSettled([
          getClub(id, options),
          getClubSquad(id, options),
          getClubStadium(id, options)
        ])

        if (clubResult.status === 'rejected' || !clubResult.value) {
          throw clubResult.reason || new Error('Club not found')
        }

        const squadData = squadResult.status === 'fulfilled' ? squadResult.value : null
        const squadRows = Array.isArray(squadData) ? squadData : squadData?.squad || squadData?.players || []
        const playerIds = [...new Set(squadRows.map(item => item.playerId || item.id).filter(Boolean))]
        let profiles = []
        if (playerIds.length > 0) {
          try {
            profiles = await getPlayers(playerIds, options)
          } catch (profileError) {
            if (isAbortError(profileError)) throw profileError
          }
        }

        setClub(clubResult.value)
        setSquad(squadRows)
        setPlayers(Array.isArray(profiles) ? profiles : [])
        setStadium(stadiumResult.status === 'fulfilled' ? stadiumResult.value : null)
      } catch (loadError) {
        if (!isAbortError(loadError)) setError(loadError.message || 'Club not found')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    loadClub()
    return () => controller.abort()
  }, [id, retryKey])

  const playerMap = useMemo(() => new Map(players.map(player => [String(player.id), player])), [players])

  if (loading) return <LoadingState label="Loading club profile and squad…" />
  if (error) return <ErrorState message={error} onRetry={() => setRetryKey(key => key + 1)} />
  if (!club) return <EmptyState title="Club not found" />

  const details = club.baseDetails || {}
  const squadDetails = club.squadDetails || {}

  return (
    <div>
      <button className="back-button" onClick={() => navigate(-1)}>← Back</button>

      <section className="profile-header club-header">
        <img src={club.crestUrl} alt={club.name} onError={getImageFallback} />
        <div className="profile-header-content">
          <span className="eyebrow">Club profile</span>
          <h1>{club.name}</h1>
          {details.shortName && details.shortName !== club.name && <p>{details.shortName}</p>}
          <div className="profile-tags">
            {details.primaryCompetitionId && <span>{details.primaryCompetitionId}</span>}
            {squadDetails.squadSize != null && <span>{squadDetails.squadSize} players</span>}
            {squadDetails.averageAge != null && <span>Average age {squadDetails.averageAge}</span>}
          </div>
          <div className="headline-value">{formatMarketValue(squadDetails.totalMarketValue)}</div>
        </div>
      </section>

      <section className="section">
        <h2>Club overview</h2>
        <div className="stat-group">
          <Stat value={squadDetails.squadSize ?? squad.length ?? 'N/A'} label="Squad size" />
          <Stat value={squadDetails.averageAge ?? 'N/A'} label="Average age" />
          <Stat value={squadDetails.foreignCount ?? 'N/A'} label="Foreign players" />
          <Stat value={squadDetails.nationalCount ?? 'N/A'} label="Internationals" />
          <Stat value={formatMarketValue(squadDetails.totalMarketValue)} label="Squad value" />
        </div>
      </section>

      {stadium && (
        <section className="section">
          <h2>Stadium</h2>
          <div className="detail-list">
            <p><strong>Name</strong><span>{stadium.stadiumName || stadium.name || 'N/A'}</span></p>
            {stadium.capacity != null && <p><strong>Capacity</strong><span>{Number(stadium.capacity).toLocaleString()}</span></p>}
            {stadium.city && <p><strong>City</strong><span>{stadium.city}</span></p>}
            {stadium.openingDate && <p><strong>Opened</strong><span>{formatDate(stadium.openingDate)}</span></p>}
          </div>
        </section>
      )}

      <section className="section">
        <h2>Squad ({squad.length})</h2>
        {squad.length > 0 ? (
          <div className="table-scroll">
            <table className="table squad-table">
              <thead><tr><th>Player</th><th>Position</th><th>Age</th><th>#</th><th>Market value</th><th>Status</th></tr></thead>
              <tbody>
                {squad.map((entry, index) => {
                  const playerId = entry.playerId || entry.id
                  const profile = playerMap.get(String(playerId))
                  return (
                    <tr key={playerId || index} onClick={() => playerId && navigate(`/players/${playerId}`)} className={playerId ? 'clickable-row' : ''}>
                      <td><div className="player-cell"><img src={profile?.portraitUrl} alt="" onError={getImageFallback} /><strong>{profile?.name || entry.playerName || entry.name || `Player #${playerId}`}</strong></div></td>
                      <td>{getPositionName(profile?.attributes?.position) || entry.position || entry.type || '-'}</td>
                      <td>{profile?.lifeDates?.age ?? '-'}</td>
                      <td>{entry.shirtNumber || '-'}</td>
                      <td>{formatMarketValue(profile?.marketValueDetails?.current?.value)}</td>
                      <td>{entry.isCaptain ? 'Captain' : entry.type || '-'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : <EmptyState title="No squad available" message="The data provider did not return a squad for this club." />}
      </section>
    </div>
  )
}

function Stat({ value, label }) {
  return <div className="stat-item"><div className="stat-value">{value}</div><div className="stat-label">{label}</div></div>
}

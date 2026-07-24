import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  getPlayer,
  getPlayerInjuries,
  getPlayerMarketValue,
  getPlayerNationalCareer,
  getPlayerSeasonalStats,
  getPlayerStatsByCompetition,
  getPlayerTransfers
} from '../api/client'
import {
  formatDate,
  formatMarketValue,
  getAge,
  getClubFromAssignments,
  getClubName,
  getImageFallback,
  isAbortError
} from '../api/utils'
import { EmptyState, ErrorState, LoadingState } from '../components/StateMessage'

const TABS = ['profile', 'market value', 'stats', 'transfers', 'injuries', 'national']

export default function PlayerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState('profile')
  const [data, setData] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadPlayer() {
      setLoading(true)
      setError(null)
      const options = { signal: controller.signal, bypassCache: retryKey > 0 }
      try {
        const results = await Promise.allSettled([
          getPlayer(id, options),
          getPlayerMarketValue(id, options),
          getPlayerTransfers(id, options),
          getPlayerInjuries(id, options),
          getPlayerNationalCareer(id, options),
          getPlayerStatsByCompetition(id, options),
          getPlayerSeasonalStats(id, undefined, options)
        ])

        const [profile, marketValue, transfers, injuries, national, statsByCompetition, seasonalStats] = results
        if (profile.status === 'rejected' || !profile.value) {
          throw profile.reason || new Error('Player not found')
        }

        setData({
          profile: profile.value,
          marketValue: marketValue.status === 'fulfilled' ? marketValue.value : null,
          transfers: transfers.status === 'fulfilled' ? transfers.value : null,
          injuries: injuries.status === 'fulfilled' ? injuries.value : null,
          national: national.status === 'fulfilled' ? national.value : null,
          statsByCompetition: statsByCompetition.status === 'fulfilled' ? statsByCompetition.value : null,
          seasonalStats: seasonalStats.status === 'fulfilled' ? seasonalStats.value : null
        })
      } catch (loadError) {
        if (!isAbortError(loadError)) setError(loadError.message || 'Player not found')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    loadPlayer()
    return () => controller.abort()
  }, [id, retryKey])

  const profile = data.profile
  const club = profile ? getClubFromAssignments(profile.clubAssignments) : null
  const age = profile?.lifeDates?.age ?? getAge(profile?.lifeDates?.dateOfBirth)
  const competitionStats = data.statsByCompetition?.performances || []
  const seasonalStats = useMemo(() => {
    if (Array.isArray(data.seasonalStats)) return data.seasonalStats
    return data.seasonalStats?.performances || data.seasonalStats?.data || []
  }, [data.seasonalStats])
  const injuries = Array.isArray(data.injuries) ? data.injuries : data.injuries?.injuries || []
  const national = Array.isArray(data.national) ? data.national : data.national?.teams || []

  if (loading) return <LoadingState label="Loading player profile…" />
  if (error) return <ErrorState message={error} onRetry={() => setRetryKey(key => key + 1)} />
  if (!profile) return <EmptyState title="Player not found" />

  return (
    <div>
      <button className="back-button" onClick={() => navigate(-1)}>← Back</button>

      <section className="profile-header">
        <img src={profile.portraitUrl} alt={profile.name} onError={getImageFallback} />
        <div className="profile-header-content">
          <span className="eyebrow">Player profile</span>
          <h1>{profile.name}</h1>
          <div className="profile-tags">
            {profile.attributes?.position?.name && <span>{profile.attributes.position.name}</span>}
            {age != null && <span>{age} years</span>}
            {club?.shirtNumber && <span>#{club.shirtNumber}</span>}
            {profile.attributes?.preferredFoot?.name && <span>{profile.attributes.preferredFoot.name} foot</span>}
          </div>
          {getClubName(club) && <p><strong>{getClubName(club)}</strong>{club.contractEndDate && ` · Contract until ${formatDate(club.contractEndDate)}`}</p>}
          <div className="headline-value">{formatMarketValue(profile.marketValueDetails?.current?.value)}</div>
        </div>
      </section>

      <div className="tabs" role="tablist">
        {TABS.map(name => (
          <button key={name} className={tab === name ? 'active' : ''} onClick={() => setTab(name)}>{name}</button>
        ))}
      </div>

      {tab === 'profile' && (
        <section className="section">
          <h2>Profile</h2>
          <div className="stat-group">
            <Stat value={formatDate(profile.lifeDates?.dateOfBirth)} label="Date of birth" />
            <Stat value={age ?? 'N/A'} label="Age" />
            <Stat value={profile.attributes?.height ? `${profile.attributes.height} m` : 'N/A'} label="Height" />
            <Stat value={formatMarketValue(profile.marketValueDetails?.current?.value)} label="Market value" />
          </div>
          <div className="detail-list">
            {profile.birthPlaceDetails?.placeOfBirth && <p><strong>Place of birth</strong><span>{profile.birthPlaceDetails.placeOfBirth}</span></p>}
            {profile.attributes?.consultantAgency?.name && <p><strong>Agent</strong><span>{profile.attributes.consultantAgency.name}</span></p>}
            {profile.attributes?.outfitter?.name && <p><strong>Outfitter</strong><span>{profile.attributes.outfitter.name}</span></p>}
          </div>
        </section>
      )}

      {tab === 'market value' && (
        <DataTable
          title="Market value history"
          rows={Array.isArray(data.marketValue) ? data.marketValue : []}
          headers={['Date', 'Value', 'Age', 'Club']}
          renderRow={(item, index) => <tr key={`${item.date}-${index}`}><td>{formatDate(item.date)}</td><td><strong>{formatMarketValue(item.marketValue)}</strong></td><td>{item.age ?? '-'}</td><td>{item.clubName || '-'}</td></tr>}
        />
      )}

      {tab === 'stats' && (
        <>
          <DataTable
            title="Career statistics by competition"
            rows={competitionStats}
            headers={['Competition', 'Apps', 'Goals', 'Assists', 'G+A']}
            renderRow={(item, index) => <tr key={`${item.entity?.name}-${index}`}><td><strong>{item.entity?.name || '-'}</strong></td><td>{item.gamesPlayed || 0}</td><td>{item.goalsScored || 0}</td><td>{item.assists || 0}</td><td><strong>{Number(item.goalsScored || 0) + Number(item.assists || 0)}</strong></td></tr>}
          />
          {seasonalStats.length > 0 && (
            <DataTable
              title="Seasonal breakdown"
              rows={seasonalStats}
              headers={['Season', 'Competition', 'Apps', 'Goals', 'Assists', 'Minutes']}
              renderRow={(item, index) => <tr key={`${item.nameSeason}-${index}`}><td>{item.nameSeason || '-'}</td><td>{item.competitionDescription || '-'}</td><td>{item.gamesPlayed || 0}</td><td>{item.goalsScored || 0}</td><td>{item.assists || 0}</td><td>{item.minutesPlayed || 0}</td></tr>}
            />
          )}
        </>
      )}

      {tab === 'transfers' && (
        <DataTable
          title="Transfer history"
          rows={data.transfers?.transfers || []}
          headers={['Date', 'From', 'To', 'Fee', 'Season']}
          renderRow={(item, index) => <tr key={`${item.date}-${index}`}><td>{formatDate(item.date)}</td><td>{item.fromClub?.name || '-'}</td><td>{item.toClub?.name || '-'}</td><td><strong>{item.transferFee ? formatMarketValue(item.transferFee) : '-'}</strong></td><td>{item.seasonName || '-'}</td></tr>}
        />
      )}

      {tab === 'injuries' && (
        <DataTable
          title="Injury history"
          rows={injuries}
          headers={['Injury', 'From', 'Until', 'Days']}
          renderRow={(item, index) => <tr key={index}><td>{item.injuryName || item.injury || '-'}</td><td>{formatDate(item.dateFrom || item.fromDate)}</td><td>{formatDate(item.dateUntil || item.untilDate)}</td><td>{item.days || '-'}</td></tr>}
        />
      )}

      {tab === 'national' && (
        <DataTable
          title="National team career"
          rows={national}
          headers={['Team', 'Appearances', 'Goals']}
          renderRow={(item, index) => <tr key={index}><td><strong>{item.teamName || item.team || '-'}</strong></td><td>{item.appearances ?? item.caps ?? '-'}</td><td>{item.goals ?? '-'}</td></tr>}
        />
      )}
    </div>
  )
}

function Stat({ value, label }) {
  return <div className="stat-item"><div className="stat-value">{value}</div><div className="stat-label">{label}</div></div>
}

function DataTable({ title, rows, headers, renderRow }) {
  return (
    <section className="section">
      <h2>{title}</h2>
      {rows.length > 0 ? (
        <div className="table-scroll"><table className="table"><thead><tr>{headers.map(header => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.map(renderRow)}</tbody></table></div>
      ) : <EmptyState title="No data available" message={`No ${title.toLowerCase()} was returned for this player.`} />}
    </section>
  )
}

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPlayer, getPlayerMarketValue, getPlayerTransfers, getPlayerInjuries, getPlayerNationalCareer, getPlayerStatsByCompetition, getPlayerSeasonalStats } from '../api/client'
import { formatMarketValue, formatDate, getImageFallback, getClubFromAssignments, getAge } from '../api/utils'

export default function PlayerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState('profile')
  const [profile, setProfile] = useState(null)
  const [mv, setMv] = useState(null)
  const [transfers, setTransfers] = useState(null)
  const [injuries, setInjuries] = useState(null)
  const [national, setNational] = useState(null)
  const [statsByComp, setStatsByComp] = useState(null)
  const [seasonalStats, setSeasonalStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    Promise.allSettled([
      getPlayer(id).catch(() => null),
      getPlayerMarketValue(id).catch(() => null),
      getPlayerTransfers(id).catch(() => null),
      getPlayerInjuries(id).catch(() => null),
      getPlayerNationalCareer(id).catch(() => null),
      getPlayerStatsByCompetition(id).catch(e => { console.error('StatsByComp error:', e); return null }),
      getPlayerSeasonalStats(id).catch(e => { console.error('SeasonalStats error:', e); return null })
    ]).then(([pR, mvR, tR, iR, nR, scR, ssR]) => {
      if (pR.status === 'rejected') throw new Error('Player not found')
      setProfile(pR.value)
      setMv(mvR.status === 'fulfilled' ? mvR.value : null)
      setTransfers(tR.status === 'fulfilled' ? tR.value : null)
      setInjuries(iR.status === 'fulfilled' ? iR.value : null)
      setNational(nR.status === 'fulfilled' ? nR.value : null)
      setStatsByComp(scR.status === 'fulfilled' ? scR.value : null)
      setSeasonalStats(ssR.status === 'fulfilled' ? ssR.value : null)
    }).catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="loading"><div className="spinner" /></div>
  if (error) return <div className="error">{error}</div>
  if (!profile) return null

  const p = profile
  const club = getClubFromAssignments(p.clubAssignments)
  const tabs = ['profile', 'market_value', 'stats', 'transfers', 'injuries', 'national']

  return (
    <div>
      <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', marginBottom: 12, color: 'var(--primary)', fontWeight: 600 }}>&larr; Back</button>

      <div className="player-header">
        <img src={p.portraitUrl} alt={p.name} onError={getImageFallback} />
        <div>
          <h2>{p.name}</h2>
          <div className="player-meta">
            {p.attributes?.position && <span className="accent-badge">{p.attributes.position.name}</span>}
            {p.lifeDates?.age && <span>{p.lifeDates.age} years</span>}
            {club?.shirtNumber && <span>#{club.shirtNumber}</span>}
            {p.attributes?.preferredFoot && <span>{p.attributes.preferredFoot.name} foot</span>}
            {p.attributes?.height && <span>{p.attributes.height}m</span>}
          </div>
          {club && (
            <p style={{ marginTop: 8 }}>
              <strong>{club.clubName || club.name || 'Club'}</strong>
              {club.startDate && <> · Joined {formatDate(club.startDate)}</>}
              {club.contractEndDate && <> · Contract until {formatDate(club.contractEndDate)}</>}
            </p>
          )}
          <p style={{ marginTop: 8 }}>
            Market Value: <strong style={{ fontSize: 20 }}>{formatMarketValue(p.marketValueDetails?.current?.value)}</strong>
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '8px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: 13,
              background: tab === t ? 'var(--primary)' : 'var(--bg)',
              color: tab === t ? '#fff' : 'var(--text)', transition: '0.2s'
            }}
          >
            {t.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className="section">
          <h3>Profile</h3>
          <div className="stat-group">
            {p.lifeDates?.dateOfBirth && (
              <div className="stat-item">
                <div className="stat-value">{formatDate(p.lifeDates.dateOfBirth)}</div>
                <div className="stat-label">Date of Birth</div>
              </div>
            )}
            {p.lifeDates?.age && (
              <div className="stat-item">
                <div className="stat-value">{p.lifeDates.age}</div>
                <div className="stat-label">Age</div>
              </div>
            )}
            {p.attributes?.height && (
              <div className="stat-item">
                <div className="stat-value">{p.attributes.height}</div>
                <div className="stat-label">Height (m)</div>
              </div>
            )}
            <div className="stat-item">
              <div className="stat-value">{formatMarketValue(p.marketValueDetails?.current?.value)}</div>
              <div className="stat-label">Current Value</div>
            </div>
          </div>
          {p.birthPlaceDetails?.placeOfBirth && (
            <p><strong>Place of birth:</strong> {p.birthPlaceDetails.placeOfBirth}</p>
          )}
          {p.nationalityDetails?.nationalities && (
            <p><strong>Nationalities:</strong> IDs: {p.nationalityDetails.nationalities.nationalityId}{p.nationalityDetails.nationalities.secondNationalityId ? `, ${p.nationalityDetails.nationalities.secondNationalityId}` : ''}</p>
          )}
          {p.attributes?.consultantAgency && (
            <p><strong>Agent:</strong> {p.attributes.consultantAgency.name}</p>
          )}
          {p.attributes?.outfitter && (
            <p><strong>Outfitter:</strong> {p.attributes.outfitter.name}</p>
          )}
        </div>
      )}

      {tab === 'market_value' && (
        <div className="section">
          <h3>Market Value History</h3>
          {mv?.length > 0 ? (
            <table className="table">
              <thead><tr><th>Date</th><th>Value</th><th>Age</th><th>Club</th></tr></thead>
              <tbody>
                {mv.map((h, i) => (
                  <tr key={i}>
                    <td>{formatDate(h.date)}</td>
                    <td style={{ fontWeight: 600 }}>{formatMarketValue(h.marketValue)}</td>
                    <td>{h.age}</td>
                    <td>{h.clubName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p style={{ color: '#777' }}>No market value history available</p>}
        </div>
      )}

      {tab === 'stats' && (
        <div className="section">
          <h3>Career Stats by Competition</h3>
          {statsByComp?.performances?.length > 0 ? (
            <table className="table">
              <thead><tr><th>Competition</th><th>Apps</th><th>Goals</th><th>Assists</th><th>G+A</th></tr></thead>
              <tbody>
                {statsByComp.performances.map((p, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{p.entity?.name || '-'}</td>
                    <td>{p.gamesPlayed || 0}</td>
                    <td>{p.goalsScored || 0}</td>
                    <td>{p.assists || 0}</td>
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{(p.goalsScored || 0) + (p.assists || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p style={{ color: '#777' }}>No stats available</p>}

          {seasonalStats?.length > 0 && (
            <>
              <h3 style={{ marginTop: 24 }}>Seasonal Breakdown</h3>
              <table className="table">
                <thead><tr><th>Season</th><th>Competition</th><th>Apps</th><th>Goals</th><th>Assists</th><th>G+A</th><th>Min</th></tr></thead>
                <tbody>
                  {seasonalStats.map((s, i) => (
                    <tr key={i}>
                      <td>{s.nameSeason || '-'}</td>
                      <td>{s.competitionDescription || '-'}</td>
                      <td>{s.gamesPlayed || 0}</td>
                      <td>{s.goalsScored || 0}</td>
                      <td>{s.assists || 0}</td>
                      <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{(s.goalsScored || 0) + (s.assists || 0)}</td>
                      <td>{s.minutesPlayed || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      {tab === 'transfers' && (
        <div className="section">
          <h3>Transfer History</h3>
          {transfers?.transfers?.length > 0 ? (
            <table className="table">
              <thead><tr><th>Date</th><th>From</th><th>To</th><th>Fee</th><th>Season</th></tr></thead>
              <tbody>
                {transfers.transfers.map((t, i) => (
                  <tr key={i}>
                    <td>{formatDate(t.date)}</td>
                    <td>{t.fromClub?.name || '-'}</td>
                    <td>{t.toClub?.name || '-'}</td>
                    <td style={{ fontWeight: 600 }}>{t.transferFee ? formatMarketValue(t.transferFee) : '-'}</td>
                    <td>{t.seasonName || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p style={{ color: '#777' }}>No transfer history available</p>}
        </div>
      )}

      {tab === 'injuries' && (
        <div className="section">
          <h3>Injury History</h3>
          {injuries?.length > 0 ? (
            <table className="table">
              <thead><tr><th>Injury</th><th>From</th><th>Until</th><th>Days</th></tr></thead>
              <tbody>
                {injuries.map((i, idx) => (
                  <tr key={idx}>
                    <td>{i.injuryName || i.injury || '-'}</td>
                    <td>{formatDate(i.dateFrom || i.fromDate)}</td>
                    <td>{formatDate(i.dateUntil || i.untilDate)}</td>
                    <td>{i.days || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p style={{ color: '#777' }}>No injury history available</p>}
        </div>
      )}

      {tab === 'national' && (
        <div className="section">
          <h3>National Team Career</h3>
          {national?.length > 0 ? (
            <table className="table">
              <thead><tr><th>Team</th><th>Appearances</th><th>Goals</th></tr></thead>
              <tbody>
                {national.map((n, i) => (
                  <tr key={i}>
                    <td>{n.teamName || n.team || '-'}</td>
                    <td>{n.appearances || n.caps || '-'}</td>
                    <td>{n.goals || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p style={{ color: '#777' }}>No national team data available</p>}
        </div>
      )}
    </div>
  )
}

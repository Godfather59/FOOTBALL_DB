import {
  getClubFromAssignments,
  getClubName,
  getContractOpportunity,
  getPositionName,
  monthsUntil
} from './utils.js'

export const FORMATIONS = {
  '4-3-3': [
    ['GK', 50, 90], ['LB', 14, 70], ['CB', 38, 72], ['CB', 62, 72], ['RB', 86, 70],
    ['CM', 28, 48], ['CM', 50, 43], ['CM', 72, 48], ['LW', 18, 20], ['ST', 50, 13], ['RW', 82, 20]
  ],
  '4-2-3-1': [
    ['GK', 50, 90], ['LB', 14, 70], ['CB', 38, 72], ['CB', 62, 72], ['RB', 86, 70],
    ['DM', 38, 51], ['DM', 62, 51], ['AM', 50, 34], ['LW', 20, 25], ['RW', 80, 25], ['ST', 50, 11]
  ],
  '3-5-2': [
    ['GK', 50, 90], ['CB', 25, 70], ['CB', 50, 74], ['CB', 75, 70], ['LWB', 10, 47],
    ['CM', 35, 48], ['AM', 50, 35], ['CM', 65, 48], ['RWB', 90, 47], ['ST', 36, 14], ['ST', 64, 14]
  ],
  '4-4-2': [
    ['GK', 50, 90], ['LB', 14, 70], ['CB', 38, 72], ['CB', 62, 72], ['RB', 86, 70],
    ['LM', 15, 42], ['CM', 40, 45], ['CM', 60, 45], ['RM', 85, 42], ['ST', 38, 14], ['ST', 62, 14]
  ]
}

export function positionGroup(positionValue) {
  const position = getPositionName(positionValue).toLowerCase()
  if (/goal/.test(position)) return 'GK'
  if (/centre-back|center-back|central defender|defender/.test(position)) return 'CB'
  if (/left-back|left back/.test(position)) return 'LB'
  if (/right-back|right back/.test(position)) return 'RB'
  if (/wing-back|wing back/.test(position)) return position.includes('left') ? 'LWB' : position.includes('right') ? 'RWB' : 'WB'
  if (/defensive midfield/.test(position)) return 'DM'
  if (/attacking midfield|number 10/.test(position)) return 'AM'
  if (/central midfield|midfield/.test(position)) return 'CM'
  if (/left wing|left winger/.test(position)) return 'LW'
  if (/right wing|right winger/.test(position)) return 'RW'
  if (/winger/.test(position)) return 'W'
  if (/second striker/.test(position)) return 'SS'
  if (/centre-forward|center-forward|striker|forward/.test(position)) return 'ST'
  return 'OTHER'
}

export function roleMatches(slotRole, playerPosition) {
  const group = positionGroup(playerPosition)
  if (slotRole === group) return true
  if (slotRole === 'CM' && ['DM', 'AM'].includes(group)) return true
  if (slotRole === 'DM' && group === 'CM') return true
  if (slotRole === 'AM' && ['CM', 'SS'].includes(group)) return true
  if (slotRole === 'LW' && ['W', 'LM'].includes(group)) return true
  if (slotRole === 'RW' && ['W', 'RM'].includes(group)) return true
  if (slotRole === 'LM' && ['LW', 'W'].includes(group)) return true
  if (slotRole === 'RM' && ['RW', 'W'].includes(group)) return true
  if (['LWB', 'RWB'].includes(slotRole) && ['LB', 'RB', 'WB'].includes(group)) return true
  if (slotRole === 'ST' && ['SS'].includes(group)) return true
  return false
}

function closeness(a, b, tolerance) {
  if (a == null || b == null) return 0.45
  return Math.max(0, 1 - Math.abs(Number(a) - Number(b)) / tolerance)
}

export function calculateSimilarity(source, candidate, sourceStats = {}, candidateStats = {}, weights = {}) {
  const config = { position: 30, age: 20, value: 20, output: 20, height: 5, foot: 5, ...weights }
  const sourcePosition = positionGroup(source?.attributes?.position)
  const candidatePosition = positionGroup(candidate?.attributes?.position)
  const sourceValue = Number(source?.marketValueDetails?.current?.value || 0)
  const candidateValue = Number(candidate?.marketValueDetails?.current?.value || 0)
  const sourceOutput = Number(sourceStats.goals || 0) + Number(sourceStats.assists || 0)
  const candidateOutput = Number(candidateStats.goals || 0) + Number(candidateStats.assists || 0)
  let score = 0
  score += (sourcePosition === candidatePosition ? 1 : roleMatches(sourcePosition, candidate?.attributes?.position) ? 0.65 : 0.1) * config.position
  score += closeness(source?.lifeDates?.age, candidate?.lifeDates?.age, 10) * config.age
  score += closeness(sourceValue, candidateValue, Math.max(sourceValue, 5_000_000)) * config.value
  score += closeness(sourceOutput, candidateOutput, Math.max(sourceOutput, 10)) * config.output
  score += closeness(source?.attributes?.height, candidate?.attributes?.height, 0.25) * config.height
  const sourceFoot = source?.attributes?.preferredFoot?.name
  const candidateFoot = candidate?.attributes?.preferredFoot?.name
  score += (!sourceFoot || !candidateFoot ? 0.45 : sourceFoot === candidateFoot ? 1 : 0) * config.foot
  const maximum = Object.values(config).reduce((sum, value) => sum + Number(value || 0), 0) || 100
  return Math.round((score / maximum) * 100)
}

export function transferFitScore(player, club, squad = [], preferences = {}) {
  const age = Number(player?.lifeDates?.age)
  const value = Number(player?.marketValueDetails?.current?.value || 0)
  const targetRole = positionGroup(player?.attributes?.position)
  const sameRole = squad.filter(member => positionGroup(member?.attributes?.position || member?.position) === targetRole)
  const opportunity = getContractOpportunity(player, 18)
  const ageTarget = Number(preferences.ageTarget || 25)
  const maxValue = Number(preferences.maxValue || club?.marketValue || club?.totalMarketValue || 50_000_000)
  const formation = preferences.formation || '4-3-3'
  const requiredRoles = (FORMATIONS[formation] || FORMATIONS['4-3-3']).filter(([role]) => role === targetRole || roleMatches(role, player?.attributes?.position)).length || 1
  const depthNeed = Math.max(0, Math.min(100, 100 - Math.max(0, sameRole.length - requiredRoles) * 30 - Math.min(sameRole.length, requiredRoles) * 12))
  const ageFit = Number.isFinite(age) ? Math.max(0, 100 - Math.abs(age - ageTarget) * 8) : 50
  const affordability = value > 0 ? Math.max(0, 100 - (value / Math.max(maxValue, 1)) * 100) : 65
  const contractLeverage = opportunity.type === 'free-agent' ? 100 : opportunity.type === 'expired' ? 95 : opportunity.type === 'expiring' ? 82 : 48
  const score = Math.round(depthNeed * 0.4 + ageFit * 0.2 + affordability * 0.2 + contractLeverage * 0.2)
  return {
    score: Math.max(0, Math.min(100, score)),
    targetRole,
    sameRoleCount: sameRole.length,
    requiredRoles,
    breakdown: [
      { label: 'Squad need', value: Math.round(depthNeed), explanation: `${sameRole.length} comparable ${targetRole} option${sameRole.length === 1 ? '' : 's'} for ${requiredRoles} formation slot${requiredRoles === 1 ? '' : 's'}.` },
      { label: 'Age profile', value: Math.round(ageFit), explanation: `Compared with a target age of ${ageTarget}.` },
      { label: 'Affordability', value: Math.round(affordability), explanation: `Uses the player value against the selected budget.` },
      { label: 'Contract leverage', value: Math.round(contractLeverage), explanation: opportunity.label }
    ]
  }
}

export function transferType(transfer) {
  const raw = String(transfer?.transferType || transfer?.type || transfer?.feeText || '').toLowerCase()
  if (raw.includes('loan')) return 'Loan'
  if (raw.includes('free')) return 'Free transfer'
  if (raw.includes('end of loan') || raw.includes('return')) return 'Loan return'
  const fee = Number(transfer?.transferFee || transfer?.fee || 0)
  return fee > 0 ? 'Permanent' : 'Unknown'
}

export function marketTrend(history) {
  const rows = Array.isArray(history) ? history.filter(item => Number.isFinite(Number(item.marketValue))) : []
  if (rows.length < 2) return { change: 0, direction: 'flat' }
  const first = Number(rows[0].marketValue)
  const last = Number(rows[rows.length - 1].marketValue)
  const change = last - first
  return { change, direction: change > 0 ? 'rising' : change < 0 ? 'falling' : 'flat' }
}

export function rankScore(item, category) {
  const player = item.player || item
  const stats = item.stats || {}
  const value = Number(player?.marketValueDetails?.current?.value || 0)
  const age = Number(player?.lifeDates?.age || 99)
  const output = Number(stats.goals || 0) + Number(stats.assists || 0)
  const opportunity = getContractOpportunity(player, 18)
  if (category === 'young') return age <= 23 ? 100 - age : -Infinity
  if (category === 'free-agents') return opportunity.type === 'free-agent' ? value + output * 1_000_000 : -Infinity
  if (category === 'value') return value
  if (category === 'contributions') return output
  if (category === 'value-for-money') return output / Math.max(value / 1_000_000, 0.5)
  if (category === 'contracts') {
    const months = monthsUntil(opportunity.contractEndDate)
    return opportunity.type === 'free-agent' ? 1_000 : months == null ? -Infinity : 100 - Math.max(months, 0)
  }
  if (category === 'risers') return Number(item.trend?.change || 0)
  if (category === 'fallers') return -Number(item.trend?.change || 0)
  return 0
}

export function squadSummary(slots) {
  const players = slots.map(slot => slot.player).filter(Boolean)
  const values = players.map(player => Number(player.marketValue || player.marketValueDetails?.current?.value || 0))
  const ages = players.map(player => Number(player.age ?? player.lifeDates?.age)).filter(Number.isFinite)
  const missing = slots.filter(slot => !slot.player).map(slot => slot.role)
  const mismatches = slots.filter(slot => slot.player && !roleMatches(slot.role, slot.player.position || slot.player.attributes?.position))
  return {
    playerCount: players.length,
    totalValue: values.reduce((sum, value) => sum + value, 0),
    averageAge: ages.length ? ages.reduce((sum, value) => sum + value, 0) / ages.length : null,
    missing,
    mismatches
  }
}

export function clubNameFromPlayer(player) {
  return getClubName(getClubFromAssignments(player?.clubAssignments))
}

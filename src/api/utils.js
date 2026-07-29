export function formatMarketValue(value) {
  if (value === null || value === undefined || value === '') return 'N/A'
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return 'N/A'
  if (numericValue >= 1_000_000_000) return `€${(numericValue / 1_000_000_000).toFixed(2)}bn`
  if (numericValue >= 1_000_000) return `€${(numericValue / 1_000_000).toFixed(2)}m`
  if (numericValue >= 1_000) return `€${(numericValue / 1_000).toFixed(0)}k`
  return `€${numericValue}`
}

export function formatDate(dateStr) {
  if (!dateStr) return 'N/A'
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return 'N/A'
  return date.toLocaleDateString('en-GB', {
    year: 'numeric', month: 'short', day: 'numeric'
  })
}

export function getImageFallback(event) {
  event.currentTarget.onerror = null
  event.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect fill="%23eee" width="80" height="80"/><text fill="%23999" font-size="30" x="50%" y="50%" text-anchor="middle" dy=".3em">⚽</text></svg>'
}

export function getPositionName(position) {
  if (!position) return ''
  if (typeof position === 'string') return position
  return position.name || position.shortName || ''
}

export function getActiveClubAssignment(assignments, now = new Date()) {
  if (!Array.isArray(assignments)) return null
  const timestamp = now.getTime()
  return assignments.find(item => {
    if (item?.type !== 'club') return false
    if (!item.endDate) return true
    const end = new Date(item.endDate).getTime()
    return Number.isFinite(end) && end >= timestamp
  }) || null
}

export function getClubFromAssignments(assignments) {
  if (!Array.isArray(assignments) || assignments.length === 0) return null
  return getActiveClubAssignment(assignments)
    || assignments.find(item => item.type === 'club')
    || assignments[0]
}

export function getClubName(assignment) {
  return assignment?.clubName || assignment?.name || assignment?.club?.name || ''
}

export function getContractEndDate(playerOrAssignment) {
  if (!playerOrAssignment) return null
  const assignment = Array.isArray(playerOrAssignment.clubAssignments)
    ? getActiveClubAssignment(playerOrAssignment.clubAssignments)
    : playerOrAssignment
  return assignment?.contractEndDate || assignment?.contractUntil || assignment?.endDate || null
}

export function monthsUntil(dateValue, now = new Date()) {
  if (!dateValue) return null
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return null
  return (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.4375)
}

export function getContractOpportunity(player, withinMonths = 18, now = new Date()) {
  const activeClub = getActiveClubAssignment(player?.clubAssignments, now)
  if (!activeClub || !getClubName(activeClub)) {
    return { type: 'free-agent', label: 'Free agent', monthsRemaining: null, contractEndDate: null }
  }

  const contractEndDate = getContractEndDate(activeClub)
  const monthsRemaining = monthsUntil(contractEndDate, now)
  if (monthsRemaining === null) {
    return { type: 'unknown', label: 'Contract unknown', monthsRemaining: null, contractEndDate: null }
  }
  if (monthsRemaining <= 0) {
    return { type: 'expired', label: 'Contract expired', monthsRemaining, contractEndDate }
  }
  if (monthsRemaining <= withinMonths) {
    const rounded = Math.max(1, Math.ceil(monthsRemaining))
    return { type: 'expiring', label: `Expires in ${rounded} month${rounded === 1 ? '' : 's'}`, monthsRemaining, contractEndDate }
  }
  return { type: 'secure', label: 'Contract secured', monthsRemaining, contractEndDate }
}

export function summarizePerformances(data) {
  const performances = Array.isArray(data) ? data : data?.performances || []
  return performances.reduce((totals, item) => ({
    appearances: totals.appearances + Number(item.gamesPlayed || item.appearances || 0),
    goals: totals.goals + Number(item.goalsScored || item.goals || 0),
    assists: totals.assists + Number(item.assists || 0),
    minutes: totals.minutes + Number(item.minutesPlayed || item.minutes || 0)
  }), { appearances: 0, goals: 0, assists: 0, minutes: 0 })
}

export function getAge(dateOfBirth) {
  if (!dateOfBirth) return null
  const born = new Date(dateOfBirth)
  if (Number.isNaN(born.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - born.getFullYear()
  const monthDifference = now.getMonth() - born.getMonth()
  if (monthDifference < 0 || (monthDifference === 0 && now.getDate() < born.getDate())) age -= 1
  return age
}

export function parsePositiveInt(value, fallback = 1) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export function isAbortError(error) {
  return error?.name === 'AbortError'
}

export async function mapWithConcurrency(items, limit, mapper, signal) {
  if (!Array.isArray(items) || items.length === 0) return []
  const results = new Array(items.length)
  let nextIndex = 0

  async function worker() {
    while (nextIndex < items.length) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      const currentIndex = nextIndex
      nextIndex += 1
      results[currentIndex] = await mapper(items[currentIndex], currentIndex)
    }
  }

  const workerCount = Math.max(1, Math.min(limit, items.length))
  await Promise.all(Array.from({ length: workerCount }, () => worker()))
  return results
}

export function uniqueBy(items, keySelector) {
  const seen = new Set()
  return items.filter(item => {
    const key = keySelector(item)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function chunk(items, size = 20) {
  const chunks = []
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size))
  return chunks
}

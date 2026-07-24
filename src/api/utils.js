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

export function getClubFromAssignments(assignments) {
  if (!Array.isArray(assignments) || assignments.length === 0) return null
  return assignments.find(item => item.type === 'club' && !item.endDate)
    || assignments.find(item => item.type === 'club')
    || assignments[0]
}

export function getClubName(assignment) {
  return assignment?.clubName || assignment?.name || assignment?.club?.name || ''
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

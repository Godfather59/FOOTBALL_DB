export function formatMarketValue(value) {
  if (!value && value !== 0) return 'N/A'
  const v = Number(value)
  if (v >= 1000000) return `€${(v / 1000000).toFixed(2)}m`
  if (v >= 1000) return `€${(v / 1000).toFixed(0)}k`
  return `€${v}`
}

export function formatDate(dateStr) {
  if (!dateStr) return 'N/A'
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  })
}

export function getImageFallback(e) {
  e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect fill="%23eee" width="80" height="80"/><text fill="%23999" font-size="30" x="50%" y="50%" text-anchor="middle" dy=".3em">⚽</text></svg>'
}

export function getPositionName(pos) {
  if (!pos) return ''
  if (typeof pos === 'string') return pos
  return pos.name || pos.shortName || ''
}

export function getPositionShort(pos) {
  if (!pos) return ''
  if (typeof pos === 'string') return pos
  return pos.shortName || pos.name || ''
}

export function getClubFromAssignments(assignments) {
  if (!assignments) return null
  return assignments.find(a => a.type === 'club') || assignments[0] || null
}

export function getAge(dateOfBirth) {
  if (!dateOfBirth) return null
  const born = new Date(dateOfBirth)
  const now = new Date()
  let age = now.getFullYear() - born.getFullYear()
  const m = now.getMonth() - born.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < born.getDate())) age--
  return age
}

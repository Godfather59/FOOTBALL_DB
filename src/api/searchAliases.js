function clean(value) {
  return String(value || '').trim().replace(/\s+/g, ' ')
}

function unique(values) {
  return [...new Set(values.map(clean).filter(Boolean))]
}

const TEAM_ALIASES = {
  'raja club athletic': ['Raja Casablanca'],
  'raja club athletic casablanca': ['Raja Casablanca'],
  'raja ca': ['Raja Casablanca'],
  'raja casablanca': ['Raja Club Athletic']
}

export function teamSearchVariants(query) {
  const original = clean(query)
  const key = original.toLowerCase()
  return unique([original, ...(TEAM_ALIASES[key] || [])])
}

export function playerSearchVariants(query) {
  const original = clean(query)
  const variants = [original]
  if (/^sabir\b/i.test(original)) variants.push(original.replace(/^sabir\b/i, 'Saber'))
  if (/^saber\b/i.test(original)) variants.push(original.replace(/^saber\b/i, 'Sabir'))
  return unique(variants)
}

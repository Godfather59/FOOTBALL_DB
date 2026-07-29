const TARGETS = {
  tm: process.env.TMAPI_BASE_URL || 'https://tmapi-alpha.transfermarkt.technology',
  ce: process.env.TRANSFERMARKT_CEAPI_BASE_URL || 'https://www.transfermarkt.com.tr/ceapi',
  af: process.env.API_FOOTBALL_BASE_URL || 'https://v3.football.api-sports.io',
  fd: process.env.FOOTBALL_DATA_BASE_URL || 'https://api.football-data.org/v4',
  tsdb: process.env.THESPORTSDB_BASE_URL || 'https://www.thesportsdb.com/api/v1/json/123',
  oldb: process.env.OPENLIGADB_BASE_URL || 'https://api.openligadb.de',
  sb: process.env.STATSBOMB_OPEN_DATA_BASE_URL || 'https://raw.githubusercontent.com/hudl/open-data/master/data'
}

const CACHE_CONTROL = {
  af: 'public, s-maxage=21600, stale-while-revalidate=86400',
  fd: 'public, s-maxage=1800, stale-while-revalidate=21600',
  tsdb: 'public, s-maxage=21600, stale-while-revalidate=86400',
  oldb: 'public, s-maxage=1800, stale-while-revalidate=21600',
  sb: 'public, s-maxage=86400, stale-while-revalidate=604800',
  tm: 'public, s-maxage=300, stale-while-revalidate=1800',
  ce: 'public, s-maxage=300, stale-while-revalidate=1800'
}

const ALLOWED_METHODS = new Set(['GET', 'HEAD'])

export default async function handler(req, res) {
  if (!ALLOWED_METHODS.has(req.method)) {
    res.setHeader('Allow', 'GET, HEAD')
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const pathParts = Array.isArray(req.query.path)
    ? req.query.path
    : String(req.query.path || '').split('/').filter(Boolean)
  const [source, ...endpointParts] = pathParts
  const targetBase = TARGETS[source]

  if (!targetBase || endpointParts.length === 0) {
    return res.status(404).json({ message: 'Unknown football data endpoint' })
  }
  if (source === 'af' && !process.env.API_FOOTBALL_KEY) {
    return res.status(503).json({ message: 'API-Football is not configured. Add API_FOOTBALL_KEY to the server environment.' })
  }
  if (source === 'fd' && !process.env.FOOTBALL_DATA_TOKEN) {
    return res.status(503).json({ message: 'football-data.org is not configured. Add FOOTBALL_DATA_TOKEN to the server environment.' })
  }

  const targetUrl = new URL(`${targetBase.replace(/\/$/, '')}/${endpointParts.map(encodeURIComponent).join('/')}`)
  for (const [key, value] of Object.entries(req.query)) {
    if (key === 'path') continue
    const values = Array.isArray(value) ? value : [value]
    values.forEach(item => targetUrl.searchParams.append(key, item))
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), source === 'sb' ? 25_000 : 15_000)

  try {
    const headers = { Accept: 'application/json', 'User-Agent': 'FOOTBALL_DB/1.0' }
    if (source === 'af') headers['x-apisports-key'] = process.env.API_FOOTBALL_KEY
    if (source === 'fd') headers['X-Auth-Token'] = process.env.FOOTBALL_DATA_TOKEN

    const upstream = await fetch(targetUrl, { method: req.method, headers, signal: controller.signal })
    const body = await upstream.arrayBuffer()
    const contentType = upstream.headers.get('content-type') || 'application/json; charset=utf-8'
    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', CACHE_CONTROL[source] || CACHE_CONTROL.tm)
    res.setHeader('X-Football-Provider', source)
    for (const name of ['x-ratelimit-requests-limit', 'x-ratelimit-requests-remaining', 'x-ratelimit-limit', 'x-ratelimit-remaining', 'x-requests-available-minute', 'x-requestcounter-reset']) {
      const value = upstream.headers.get(name)
      if (value) res.setHeader(name, value)
    }
    return res.status(upstream.status).send(Buffer.from(body))
  } catch (error) {
    const timedOut = error?.name === 'AbortError'
    return res.status(timedOut ? 504 : 502).json({
      message: timedOut ? 'Football data provider timed out' : 'Football data provider is unavailable'
    })
  } finally {
    clearTimeout(timeout)
  }
}

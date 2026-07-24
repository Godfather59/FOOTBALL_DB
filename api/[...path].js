const TARGETS = {
  tm: process.env.TMAPI_BASE_URL || 'https://tmapi-alpha.transfermarkt.technology',
  ce: process.env.TRANSFERMARKT_CEAPI_BASE_URL || 'https://www.transfermarkt.com.tr/ceapi'
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

  const targetUrl = new URL(`${targetBase.replace(/\/$/, '')}/${endpointParts.map(encodeURIComponent).join('/')}`)
  for (const [key, value] of Object.entries(req.query)) {
    if (key === 'path') continue
    const values = Array.isArray(value) ? value : [value]
    values.forEach(item => targetUrl.searchParams.append(key, item))
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12_000)

  try {
    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'FOOTBALL_DB/1.0'
      },
      signal: controller.signal
    })

    const body = await upstream.arrayBuffer()
    const contentType = upstream.headers.get('content-type') || 'application/json; charset=utf-8'
    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=1800')
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

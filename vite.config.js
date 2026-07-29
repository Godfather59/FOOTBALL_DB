import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

function proxyTarget(baseUrl, prefix, headers = {}) {
  const base = new URL(baseUrl)
  const basePath = base.pathname.replace(/\/$/, '')
  return {
    target: base.origin,
    changeOrigin: true,
    rewrite: path => `${basePath}${path.replace(new RegExp(`^${prefix}`), '')}`,
    configure(proxy) {
      proxy.on('proxyReq', proxyReq => {
        proxyReq.setHeader('Accept', 'application/json')
        for (const [name, value] of Object.entries(headers)) {
          if (value) proxyReq.setHeader(name, value)
        }
      })
    }
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/tm': proxyTarget(env.TMAPI_BASE_URL || 'https://tmapi-alpha.transfermarkt.technology', '/api/tm'),
        '/api/ce': proxyTarget(env.TRANSFERMARKT_CEAPI_BASE_URL || 'https://www.transfermarkt.com.tr/ceapi', '/api/ce'),
        '/api/af': proxyTarget(env.API_FOOTBALL_BASE_URL || 'https://v3.football.api-sports.io', '/api/af', { 'x-apisports-key': env.API_FOOTBALL_KEY }),
        '/api/fd': proxyTarget(env.FOOTBALL_DATA_BASE_URL || 'https://api.football-data.org/v4', '/api/fd', { 'X-Auth-Token': env.FOOTBALL_DATA_TOKEN }),
        '/api/tsdb': proxyTarget(env.THESPORTSDB_BASE_URL || 'https://www.thesportsdb.com/api/v1/json/123', '/api/tsdb'),
        '/api/oldb': proxyTarget(env.OPENLIGADB_BASE_URL || 'https://api.openligadb.de', '/api/oldb'),
        '/api/sb': proxyTarget(env.STATSBOMB_OPEN_DATA_BASE_URL || 'https://raw.githubusercontent.com/hudl/open-data/master/data', '/api/sb')
      }
    }
  }
})

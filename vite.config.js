import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

function proxyTarget(baseUrl, prefix) {
  const base = new URL(baseUrl)
  const basePath = base.pathname.replace(/\/$/, '')
  return {
    target: base.origin,
    changeOrigin: true,
    rewrite: path => `${basePath}${path.replace(new RegExp(`^${prefix}`), '')}`,
    configure(proxy) {
      proxy.on('proxyReq', proxyReq => {
        proxyReq.setHeader('Accept', 'application/json')
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
        '/api/tsdb': proxyTarget(env.THESPORTSDB_BASE_URL || 'https://www.thesportsdb.com/api/v1/json/123', '/api/tsdb'),
        '/api/oldb': proxyTarget(env.OPENLIGADB_BASE_URL || 'https://api.openligadb.de', '/api/oldb'),
        '/api/sb': proxyTarget(env.STATSBOMB_OPEN_DATA_BASE_URL || 'https://raw.githubusercontent.com/hudl/open-data/master/data', '/api/sb')
      }
    }
  }
})

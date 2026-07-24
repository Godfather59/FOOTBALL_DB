import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const tmBase = new URL(env.TMAPI_BASE_URL || 'https://tmapi-alpha.transfermarkt.technology')
  const ceBase = new URL(env.TRANSFERMARKT_CEAPI_BASE_URL || 'https://www.transfermarkt.com.tr/ceapi')
  const afBase = new URL(env.API_FOOTBALL_BASE_URL || 'https://v3.football.api-sports.io')
  const cePath = ceBase.pathname.replace(/\/$/, '')
  const afPath = afBase.pathname.replace(/\/$/, '')

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/tm': {
          target: tmBase.origin,
          changeOrigin: true,
          rewrite: path => `${tmBase.pathname.replace(/\/$/, '')}${path.replace(/^\/api\/tm/, '')}`
        },
        '/api/ce': {
          target: ceBase.origin,
          changeOrigin: true,
          rewrite: path => `${cePath}${path.replace(/^\/api\/ce/, '')}`
        },
        '/api/af': {
          target: afBase.origin,
          changeOrigin: true,
          rewrite: path => `${afPath}${path.replace(/^\/api\/af/, '')}`,
          configure(proxy) {
            proxy.on('proxyReq', proxyReq => {
              proxyReq.setHeader('Accept', 'application/json')
              if (env.API_FOOTBALL_KEY) proxyReq.setHeader('x-apisports-key', env.API_FOOTBALL_KEY)
            })
          }
        }
      }
    }
  }
})

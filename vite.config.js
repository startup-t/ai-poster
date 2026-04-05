import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 3000,
    open: true,
    proxy: {
      // Proxy Remove.bg API calls to avoid CORS issues in dev
      '/api/removebg': {
        target: 'https://api.remove.bg',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/removebg/, '/v1.0/removebg'),
        headers: {
          'X-Api-Key': process.env.VITE_REMOVEBG_API_KEY || ''
        }
      }
    }
  }
})

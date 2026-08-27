import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import { createApiApp } from './server/app.js'
import { ensureDb, readDb, importGoogleCalendarEvents } from './server/store.js'
import { ensureVapidKeys } from './server/push.js'

export default defineConfig({
  plugins: [
    vue(),
    vuetify({ autoImport: true }),
    {
      name: 'patrimoine-json-api',
      configureServer(server) {
        ensureDb()
          .then(() => readDb())
          .then(() => {
            try {
              ensureVapidKeys()
            } catch {
              /* recette sans écriture data/ */
            }
          })
          .then(() => importGoogleCalendarEvents({ onlyIfNeeded: true }))
          .catch(() => {})
        const api = createApiApp()
        server.middlewares.use((req, res, next) => {
          if (req.url.startsWith('/api') || req.url.startsWith('/uploads')) {
            api(req, res, next)
            return
          }
          next()
        })
      },
    },
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    host: true,
    allowedHosts: true,
  },
})

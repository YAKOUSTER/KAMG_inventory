import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createProductionApp } from './app.js'
import { ensureDb, readDb, syncGoogleCalendar } from './store.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.resolve(__dirname, '../dist')
const port = Number(process.env.PORT || 4173)
const AGENDA_SYNC_MS = 15 * 60 * 1000

await ensureDb()
await readDb()
syncGoogleCalendar().catch(() => {})
setInterval(() => {
  syncGoogleCalendar().catch(() => {})
}, AGENDA_SYNC_MS)

const app = createProductionApp(distDir)
app.listen(port, () => {
  console.log(`Gestion du patrimoine textiles — Korriganed Ar Meilhoù Glas (JSON) sur http://localhost:${port}`)
})

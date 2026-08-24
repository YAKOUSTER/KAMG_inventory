import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createProductionApp } from './app.js'
import { ensureDb, readDb, importGoogleCalendarEvents } from './store.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.resolve(__dirname, '../dist')
const port = Number(process.env.PORT || 4173)

await ensureDb()
await readDb()
importGoogleCalendarEvents({ onlyIfNeeded: true }).catch((error) => {
  console.warn('Import Google Agenda ignoré :', error.message)
})

const app = createProductionApp(distDir)
app.listen(port, () => {
  console.log(`Gestion du patrimoine textiles — Korriganed Ar Meilhoù Glas (JSON) sur http://localhost:${port}`)
})

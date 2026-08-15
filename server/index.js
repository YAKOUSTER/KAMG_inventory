import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createProductionApp } from './app.js'
import { ensureDb, readDb } from './store.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.resolve(__dirname, '../dist')
const port = Number(process.env.PORT || 4173)

await ensureDb()
await readDb()
const app = createProductionApp(distDir)
app.listen(port, () => {
  console.log(`Patrimoine textile (JSON) sur http://localhost:${port}`)
})

#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { importGlideSujetsCsv } from '../server/glideSujetsImport.js'
import { normalizeMemberPages } from '../server/memberContent.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const csvPath = path.resolve(root, process.argv[2] || 'data/glide-sujets.csv')
const outPath = path.resolve(root, 'data/member-pages.json')

const csv = await readFile(csvPath, 'utf8')
const pages = normalizeMemberPages(importGlideSujetsCsv(csv))

const output = {
  meta: {
    memberContentVersion: 4,
    source: 'Export Glide — App Sujets.csv',
    importedAt: new Date().toISOString(),
    pageCount: pages.length,
  },
  pages,
}

await writeFile(outPath, `${JSON.stringify(output, null, 2)}\n`)
console.log(`Importé ${pages.length} sujets → ${outPath}`)
for (const page of pages) {
  console.log(`  • [${page.categorie}] ${page.titre} (${page.medias.length} médias)`)
}

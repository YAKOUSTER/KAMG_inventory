<template>
  <div>
    <h1 class="text-h4 page-title mb-2">Paramètres</h1>
    <p class="text-body-1 text-medium-emphasis mb-6">
      Les données vivent dans un fichier JSON (<code>data/db.json</code>), comme AppMEUR et Brocstock.
      Pas de base payante : un export régulier suffit comme sauvegarde.
    </p>

    <v-row>
      <v-col cols="12" md="6">
        <v-card variant="outlined">
          <v-card-title>Exporter</v-card-title>
          <v-card-text>
            Télécharge tout l’inventaire (pièces, personnes, emprunts) en un seul fichier JSON.
            Les photos restent dans <code>data/uploads</code> : copiez ce dossier avec l’export pour une sauvegarde complète.
          </v-card-text>
          <v-card-actions>
            <v-btn color="primary" prepend-icon="mdi-download" @click="exportJson">Télécharger la base JSON</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
      <v-col cols="12" md="6">
        <v-card variant="outlined">
          <v-card-title>Importer</v-card-title>
          <v-card-text>
            Remplace la base locale par un fichier JSON précédemment exporté. Faites un export avant.
            <v-file-input v-model="file" class="mt-4" accept="application/json,.json" label="Fichier JSON" />
            <v-alert v-if="message" :type="ok ? 'success' : 'error'" class="mt-2">{{ message }}</v-alert>
          </v-card-text>
          <v-card-actions>
            <v-btn color="warning" :disabled="!file" :loading="loading" @click="importJson">Importer</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { api } from '@/services/api'
import { useInventoryStore } from '@/stores/inventory'

const inventory = useInventoryStore()
const file = ref(null)
const loading = ref(false)
const message = ref('')
const ok = ref(false)

async function exportJson() {
  const data = await api.exportDb()
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `patrimoine-textile-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(url)
}

async function importJson() {
  const chosen = Array.isArray(file.value) ? file.value[0] : file.value
  if (!chosen) return
  loading.value = true
  message.value = ''
  try {
    const text = await chosen.text()
    const payload = JSON.parse(text)
    await api.importDb(payload)
    await inventory.refresh()
    ok.value = true
    message.value = 'Import terminé.'
  } catch (error) {
    ok.value = false
    message.value = error.message || 'Fichier JSON invalide.'
  } finally {
    loading.value = false
  }
}
</script>

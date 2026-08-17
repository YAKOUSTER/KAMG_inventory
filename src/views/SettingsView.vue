<template>
  <div>
    <h1 class="text-h4 page-title mb-2">Paramètres</h1>
    <p class="text-body-1 text-medium-emphasis mb-8">
      Les données vivent dans un fichier JSON (<code>data/db.json</code>).
      Pas de base payante : un export régulier suffit comme sauvegarde.
    </p>

    <ReferentielsEditor />

    <section class="page-block">
      <h2 class="section-label">Exporter</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Télécharge tout l’inventaire (pièces, personnes, emprunts) en un seul fichier JSON.
        Les photos restent dans <code>data/uploads</code> : copiez ce dossier avec l’export pour une sauvegarde complète.
      </p>
      <v-btn color="primary" prepend-icon="mdi-download" @click="exportJson">Télécharger la base JSON</v-btn>
    </section>

    <section class="page-block">
      <h2 class="section-label">Importer</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Remplace la base locale par un fichier JSON précédemment exporté. Faites un export avant.
        Les comptes de connexion déjà créés sont conservés si le fichier importé n’en contient pas.
      </p>
      <v-file-input v-model="file" accept="application/json,.json" label="Fichier JSON" />
      <v-alert v-if="message" :type="ok ? 'success' : 'error'" class="mt-2 mb-4">{{ message }}</v-alert>
      <v-btn color="warning" :disabled="!file" :loading="loading" @click="importJson">Importer</v-btn>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { api } from '@/services/api'
import { useInventoryStore } from '@/stores/inventory'
import ReferentielsEditor from '@/components/ReferentielsEditor.vue'

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
  if (
    !confirm(
      'Remplacer toute la base locale par ce fichier ?\n\nFaites un export avant si vous n’avez pas de sauvegarde récente.',
    )
  ) {
    return
  }
  loading.value = true
  message.value = ''
  try {
    const text = await chosen.text()
    const payload = JSON.parse(text)
    await api.importDb(payload)
    await inventory.refresh({ force: true })
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

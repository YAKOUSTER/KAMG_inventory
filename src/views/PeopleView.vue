<template>
  <div>
    <div class="d-flex align-center mb-6">
      <h1 class="text-h4 page-title">Personnes</h1>
      <v-spacer />
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreate">Ajouter</v-btn>
    </div>

    <v-data-table :headers="headers" :items="inventory.people" item-value="id">
      <template #item.actions="{ item }">
        <v-btn size="small" variant="text" @click="openEdit(item)">Modifier</v-btn>
        <v-btn size="small" variant="text" color="error" @click="remove(item)">Supprimer</v-btn>
      </template>
    </v-data-table>

    <v-dialog v-model="dialog" max-width="520">
      <v-card>
        <v-card-title>{{ editing.id ? 'Modifier' : 'Nouvelle personne' }}</v-card-title>
        <v-card-text>
          <v-text-field v-model="editing.nom" label="Nom" />
          <v-text-field v-model="editing.role" label="Rôle" />
          <v-text-field v-model="editing.telephone" label="Téléphone" />
          <v-text-field v-model="editing.email" label="Email" />
          <v-textarea v-model="editing.notes" label="Notes" rows="2" />
          <v-alert v-if="error" type="error">{{ error }}</v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="dialog = false">Annuler</v-btn>
          <v-btn color="primary" @click="save">Enregistrer</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useInventoryStore } from '@/stores/inventory'
import { api } from '@/services/api'

const inventory = useInventoryStore()
const dialog = ref(false)
const error = ref('')
const editing = reactive({ id: '', nom: '', role: 'Membre', telephone: '', email: '', notes: '' })

const headers = [
  { title: 'Nom', key: 'nom' },
  { title: 'Rôle', key: 'role' },
  { title: 'Téléphone', key: 'telephone' },
  { title: 'Email', key: 'email' },
  { title: '', key: 'actions', sortable: false },
]

function openCreate() {
  Object.assign(editing, { id: '', nom: '', role: 'Membre', telephone: '', email: '', notes: '' })
  error.value = ''
  dialog.value = true
}

function openEdit(person) {
  Object.assign(editing, person)
  error.value = ''
  dialog.value = true
}

async function save() {
  error.value = ''
  try {
    if (editing.id) await api.updatePerson(editing.id, editing)
    else await api.createPerson(editing)
    dialog.value = false
    await inventory.refresh()
  } catch (err) {
    error.value = err.message
  }
}

async function remove(person) {
  if (!confirm(`Supprimer ${person.nom} ?`)) return
  await api.deletePerson(person.id)
  await inventory.refresh()
}

onMounted(() => inventory.refresh().catch(() => {}))
</script>

<template>
  <div>
    <div class="d-flex flex-wrap align-center ga-3 mb-6">
      <h1 class="text-h5 text-md-h4 page-title">Comptes et accès</h1>
      <v-spacer />
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreate">Nouveau compte</v-btn>
    </div>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Trois profils de gestion (Administrateur, Gestion, Lecteur) et les comptes membres. Les inscriptions en attente se rangent dans « À ranger ». « Lien mot de passe » copie un lien valable une heure.
    </p>

    <div v-for="user in users" :key="user.id" class="stack-item">
      <div class="d-flex flex-wrap align-center ga-2">
        <span class="text-subtitle-1 font-weight-bold">{{ user.nom }}</span>
        <v-chip size="small" variant="tonal">{{ roleLabel(user.role) }}</v-chip>
        <v-chip v-if="user.status === 'pending'" size="small" color="warning" variant="tonal">À ranger</v-chip>
        <v-chip v-if="user.custom" size="small" color="warning" variant="tonal">Accès personnalisés</v-chip>
        <v-spacer />
        <span class="text-body-2 text-medium-emphasis">{{ user.login }}</span>
      </div>
      <div class="text-caption my-2">{{ permissionSummary(user) }}</div>
      <div class="d-flex flex-wrap ga-2">
        <v-btn size="small" variant="text" color="primary" @click="openEdit(user)">Modifier les accès</v-btn>
        <v-btn
          size="small"
          variant="text"
          class="text-none"
          :loading="resettingId === user.id"
          @click="copyResetLink(user)"
        >
          Lien mot de passe
        </v-btn>
        <v-btn size="small" variant="text" color="error" @click="remove(user)">Supprimer</v-btn>
      </div>
    </div>

    <v-dialog v-model="dialog" :fullscreen="smAndDown" max-width="640">
      <v-card>
        <v-card-title class="d-flex align-center">
          <span>{{ editing.id ? 'Modifier le compte' : 'Nouveau compte' }}</span>
          <v-spacer />
          <v-btn icon variant="text" aria-label="Fermer" @click="dialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text style="overflow-y: auto">
          <v-text-field v-model="editing.nom" label="Nom affiché" />
          <v-text-field v-model="editing.login" label="Identifiant" :disabled="Boolean(editing.id)" />
          <v-text-field
            v-model="editing.password"
            :label="editing.id ? 'Nouveau mot de passe (laisser vide pour ne pas changer)' : 'Mot de passe'"
            type="password"
          />
          <v-select v-model="editing.role" :items="roleItems" label="Profil" @update:model-value="onRole" />
          <v-switch v-model="editing.custom" label="Personnaliser les accès de ce compte" color="primary" hide-details />
          <v-checkbox
            v-for="perm in PERMISSIONS"
            :key="perm.id"
            :model-value="editing.permissions.includes(perm.id)"
            :label="perm.label"
            :disabled="!editing.custom"
            hide-details
            density="compact"
            @update:model-value="toggle(perm.id, $event)"
          />
          <v-alert v-if="error" type="error" class="mt-3">{{ error }}</v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="dialog = false">Annuler</v-btn>
          <v-btn color="primary" :loading="saving" @click="save">Enregistrer</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useDisplay } from 'vuetify'
import { api } from '@/services/api'
import { PERMISSIONS, ROLE_PRESETS, ROLES } from '@/domain/auth'
import { useUiStore } from '@/stores/ui'

const { smAndDown } = useDisplay()
const ui = useUiStore()
const users = ref([])
const dialog = ref(false)
const saving = ref(false)
const resettingId = ref('')
const error = ref('')
const editing = reactive(emptyForm())

const roleItems = ROLES.map((role) => ({ title: role.label, value: role.id }))

function emptyForm() {
  return {
    id: '',
    nom: '',
    login: '',
    password: '',
    role: 'lecteur',
    custom: false,
    permissions: [...ROLE_PRESETS.lecteur],
  }
}

function roleLabel(id) {
  return ROLES.find((role) => role.id === id)?.label || id
}

function permissionSummary(user) {
  const labels = PERMISSIONS.filter((perm) => user.permissions?.includes(perm.id)).map((perm) => perm.label)
  return labels.join(' · ')
}

function reset(form) {
  Object.assign(editing, emptyForm(), form)
}

function openCreate() {
  reset()
  error.value = ''
  dialog.value = true
}

function openEdit(user) {
  reset({
    id: user.id,
    nom: user.nom,
    login: user.login,
    password: '',
    role: user.role,
    custom: user.custom,
    permissions: [...(user.permissions || ROLE_PRESETS[user.role])],
  })
  error.value = ''
  dialog.value = true
}

function onRole(role) {
  if (!editing.custom) editing.permissions = [...ROLE_PRESETS[role]]
}

function toggle(id, checked) {
  editing.custom = true
  if (checked && !editing.permissions.includes(id)) editing.permissions.push(id)
  if (!checked) editing.permissions = editing.permissions.filter((perm) => perm !== id)
}

async function load() {
  users.value = await api.users()
}

async function save() {
  saving.value = true
  error.value = ''
  try {
    const payload = {
      nom: editing.nom,
      login: editing.login,
      role: editing.role,
      custom: editing.custom,
      permissions: editing.permissions,
    }
    if (editing.password) payload.password = editing.password
    if (editing.id) await api.updateUser(editing.id, payload)
    else await api.createUser(payload)
    dialog.value = false
    await load()
  } catch (err) {
    error.value = err.message
  } finally {
    saving.value = false
  }
}

async function copyResetLink(user) {
  resettingId.value = user.id
  try {
    const result = await api.createPasswordResetLink(user.id)
    const url = result.url || result.resetUrl
    if (!url) throw new Error('Lien introuvable')
    try {
      await navigator.clipboard.writeText(url)
      ui.notify('Lien de réinitialisation copié. Il expire dans 1 heure.')
    } catch {
      ui.notify(`Lien (1 h) : ${url}`)
    }
  } catch (err) {
    ui.notify(err.message, { color: 'error' })
  } finally {
    resettingId.value = ''
  }
}

async function remove(user) {
  if (!confirm(`Supprimer le compte ${user.login} ?`)) return
  try {
    await api.deleteUser(user.id)
    await load()
  } catch (err) {
    error.value = err.message
  }
}

onMounted(load)
</script>

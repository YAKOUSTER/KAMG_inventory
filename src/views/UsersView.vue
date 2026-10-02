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

    <v-alert
      v-if="mailStatus && !mailStatus.configured"
      type="warning"
      variant="tonal"
      class="mb-4"
    >
      Les e-mails « mot de passe oublié » ne partent pas. En attendant, utilisez « Lien mot de passe » ci-dessous.
      Pour l’envoi automatique, renseignez la boîte OVH du cercle (souvent <code>ssl0.ovh.net</code>, port 465).
    </v-alert>
    <v-alert v-else-if="mailStatus?.configured" type="success" variant="tonal" class="mb-4">
      Les e-mails de réinitialisation partent depuis {{ mailStatus.user || mailStatus.from }}.
    </v-alert>

    <v-expansion-panels class="mb-6" variant="accordion">
      <v-expansion-panel>
        <v-expansion-panel-title>E-mails de mot de passe oublié</v-expansion-panel-title>
        <v-expansion-panel-text>
          <p class="text-body-2 text-medium-emphasis mb-4">
            Compte e-mail OVH du cercle (le même que la messagerie kamg.fr). Le mot de passe n’est jamais affiché.
          </p>
          <v-text-field v-model="mailForm.host" label="Serveur SMTP" placeholder="ssl0.ovh.net" hide-details class="mb-3" />
          <v-text-field v-model="mailForm.port" label="Port" placeholder="465" hide-details class="mb-3" />
          <v-text-field v-model="mailForm.user" label="Identifiant (e-mail OVH)" type="email" hide-details class="mb-3" />
          <v-text-field
            v-model="mailForm.password"
            :label="mailStatus?.hasPassword ? 'Mot de passe (laisser vide pour conserver)' : 'Mot de passe'"
            type="password"
            hide-details
            class="mb-3"
          />
          <v-text-field v-model="mailForm.from" label="Expéditeur (optionnel)" hide-details class="mb-3" />
          <v-text-field v-model="mailForm.testTo" label="E-mail de test" type="email" hide-details class="mb-4" />
          <v-alert v-if="mailError" type="error" variant="tonal" class="mb-3">{{ mailError }}</v-alert>
          <v-alert v-if="mailOk" type="success" variant="tonal" class="mb-3">{{ mailOk }}</v-alert>
          <div class="d-flex flex-wrap ga-2">
            <v-btn color="primary" class="text-none" :loading="mailSaving" @click="saveMail">Enregistrer</v-btn>
            <v-btn variant="tonal" class="text-none" :loading="mailTesting" @click="sendTest">Envoyer un e-mail test</v-btn>
          </div>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>

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
          <p class="text-body-2 text-medium-emphasis mb-3">
            Le profil du compte (Administrateur, Gestion, Lecteur, Membre) ouvre ou ferme la Gestion.
            Ce n’est pas le même réglage que les rôles de la fiche personne (danseur, groupe vêtement…).
          </p>
          <v-select v-model="editing.role" :items="roleItems" label="Profil d’accès" @update:model-value="onRole" />
          <v-switch
            :model-value="editing.custom"
            label="Personnaliser les accès de ce compte"
            color="primary"
            hide-details
            class="mb-2"
            @update:model-value="onCustom"
          />
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
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'

const { smAndDown } = useDisplay()
const auth = useAuthStore()
const ui = useUiStore()
const users = ref([])
const dialog = ref(false)
const saving = ref(false)
const resettingId = ref('')
const error = ref('')
const editing = reactive(emptyForm())
const mailStatus = ref(null)
const mailSaving = ref(false)
const mailTesting = ref(false)
const mailError = ref('')
const mailOk = ref('')
const mailForm = reactive({
  host: 'ssl0.ovh.net',
  port: '465',
  user: '',
  password: '',
  from: '',
  testTo: '',
})

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
  editing.role = role
  editing.permissions = [...(ROLE_PRESETS[role] || [])]
  editing.custom = false
}

function onCustom(value) {
  editing.custom = Boolean(value)
  if (!editing.custom) editing.permissions = [...(ROLE_PRESETS[editing.role] || [])]
}

function toggle(id, checked) {
  editing.custom = true
  if (checked && !editing.permissions.includes(id)) editing.permissions.push(id)
  if (!checked) editing.permissions = editing.permissions.filter((perm) => perm !== id)
}

async function load() {
  users.value = await api.users()
  await loadMail()
}

async function loadMail() {
  try {
    const status = await api.mailStatus()
    mailStatus.value = status
    mailForm.host = status.host || 'ssl0.ovh.net'
    mailForm.port = String(status.port || 465)
    mailForm.user = status.user || ''
    mailForm.from = status.from || ''
    mailForm.password = ''
    if (!mailForm.testTo) {
      mailForm.testTo = status.user || auth.user?.email || (String(auth.user?.login || '').includes('@') ? auth.user.login : '')
    }
  } catch {
    mailStatus.value = { configured: false }
  }
}

async function saveMail() {
  mailSaving.value = true
  mailError.value = ''
  mailOk.value = ''
  try {
    mailStatus.value = await api.saveMail({
      host: mailForm.host,
      port: mailForm.port,
      user: mailForm.user,
      password: mailForm.password,
      from: mailForm.from,
    })
    mailForm.password = ''
    mailOk.value = 'Paramètres d’e-mail enregistrés.'
  } catch (err) {
    mailError.value = err.message
  } finally {
    mailSaving.value = false
  }
}

async function sendTest() {
  mailTesting.value = true
  mailError.value = ''
  mailOk.value = ''
  try {
    const result = await api.testMail(mailForm.testTo)
    mailOk.value = `E-mail de test envoyé à ${result.to}.`
  } catch (err) {
    mailError.value = err.message
  } finally {
    mailTesting.value = false
  }
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
    const saved = editing.id ? await api.updateUser(editing.id, payload) : await api.createUser(payload)
    if (saved?.id && saved.id === auth.user?.id) auth.setUser(saved)
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

<template>
  <section>
    <h2 class="section-label">Agenda du cercle</h2>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Les répétitions et sorties se créent, se modifient et se suppriment dans l’application.
      Apple et Outlook relisent souvent le calendrier en quelques minutes. Google Agenda le fait
      à son rythme : une modification ou une suppression peut mettre plusieurs heures à apparaître.
    </p>

    <v-alert type="info" variant="tonal" class="mb-4">
      Google Agenda refuse le raccourci automatique (« Impossible d’ajouter l’agenda, vérifier
      l’URL »). Copiez l’adresse https, puis sur un ordinateur : Google Agenda → Paramètres →
      Ajouter un agenda → À partir de l’URL. L’application téléphone ne propose pas cette option.
    </v-alert>

    <div class="form-fields-grid form-fields-grid--2 mb-4">
      <FieldRow label="Nom du calendrier publié">
        <v-text-field v-model="draft.googleCalendarName" hide-details />
      </FieldRow>
    </div>

    <div class="subscribe-urls mb-4">
      <div class="subscribe-urls__row">
        <v-text-field
          :model-value="icsUrl"
          label="Adresse https (à coller dans Google Agenda → À partir de l’URL)"
          readonly
          hide-details
          density="comfortable"
        />
        <v-btn variant="tonal" class="text-none" @click="copy(icsUrl)">Copier</v-btn>
      </div>
      <div class="subscribe-urls__row">
        <v-text-field
          :model-value="webcalUrl"
          label="Adresse webcal (iPhone, iPad, Outlook)"
          readonly
          hide-details
          density="comfortable"
        />
        <v-btn variant="tonal" class="text-none" @click="copy(webcalUrl)">Copier</v-btn>
      </div>
    </div>

    <v-alert v-if="copied" type="success" variant="tonal" class="mb-4">Adresse copiée.</v-alert>
    <v-alert v-if="message" :type="ok ? 'success' : 'error'" variant="tonal" class="mb-4">{{ message }}</v-alert>

    <div class="d-flex flex-wrap ga-3 mb-6">
      <v-btn color="primary" :loading="saving" @click="save">Enregistrer le nom</v-btn>
      <v-btn variant="tonal" prepend-icon="mdi-content-copy" class="text-none" @click="copy(icsUrl)">
        Copier l’adresse Google
      </v-btn>
      <v-btn
        variant="text"
        prepend-icon="mdi-google"
        href="https://calendar.google.com/calendar/u/0/r/settings"
        target="_blank"
        rel="noopener noreferrer"
      >
        Ouvrir Google Agenda
      </v-btn>
      <v-btn variant="outlined" prepend-icon="mdi-apple" :href="webcalUrl">
        S’abonner (Apple / Outlook)
      </v-btn>
    </div>

    <v-expansion-panels variant="accordion">
      <v-expansion-panel>
        <v-expansion-panel-title>Importer l’ancien calendrier Google</v-expansion-panel-title>
        <v-expansion-panel-text>
          <p class="text-body-2 text-medium-emphasis mb-4">
            Une fois importées, les dates se gèrent ici. Un nouvel import n’écrase pas les événements
            déjà présents : seules les dates encore absentes de l’app sont ajoutées.
          </p>
          <div class="form-fields-grid form-fields-grid--2">
            <FieldRow label="Identifiant calendrier Google">
              <v-text-field v-model="draft.googleCalendarId" hide-details hint="Adresse Gmail du calendrier" />
            </FieldRow>
            <FieldRow label="CID (base64)">
              <v-text-field v-model="draft.googleCalendarCid" hide-details />
            </FieldRow>
          </div>
          <p v-if="draft.googleImportedAt" class="text-caption text-medium-emphasis mt-3">
            Dernier import : {{ displayDateTime(draft.googleImportedAt) }}
          </p>
          <div class="d-flex flex-wrap ga-3 mt-4">
            <v-btn variant="tonal" :loading="saving" @click="save">Enregistrer l’identifiant</v-btn>
            <v-btn color="primary" variant="tonal" :loading="syncing" @click="importGoogle">
              Importer depuis Google
            </v-btn>
          </div>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import FieldRow from '@/components/FieldRow.vue'
import { api } from '@/services/api'
import { appCalendarIcsUrl, appCalendarWebcalUrl } from '@/domain/agendaSettings'
import { displayDateTime } from '@/domain/dates'

const draft = reactive({
  googleCalendarId: '',
  googleCalendarCid: '',
  googleCalendarName: '',
  googleImportedAt: '',
})
const saving = ref(false)
const syncing = ref(false)
const message = ref('')
const copied = ref(false)
const ok = ref(false)

const origin = computed(() => (typeof window === 'undefined' ? '' : window.location.origin))
const icsUrl = computed(() => appCalendarIcsUrl(origin.value))
const webcalUrl = computed(() => appCalendarWebcalUrl(origin.value))

onMounted(async () => {
  Object.assign(draft, await api.agendaSettings())
})

async function copy(value) {
  copied.value = false
  try {
    await navigator.clipboard.writeText(value)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2500)
  } catch {
    ok.value = false
    message.value = 'Copie impossible : sélectionnez l’adresse et copiez-la.'
  }
}

async function save() {
  saving.value = true
  message.value = ''
  try {
    Object.assign(draft, await api.updateAgendaSettings({ ...draft }))
    ok.value = true
    message.value = 'Paramètres d’agenda enregistrés.'
  } catch (error) {
    ok.value = false
    message.value = error.message || 'Enregistrement impossible.'
  } finally {
    saving.value = false
  }
}

async function importGoogle() {
  syncing.value = true
  message.value = ''
  try {
    await api.updateAgendaSettings({ ...draft })
    const result = await api.syncAgenda()
    Object.assign(draft, await api.agendaSettings())
    ok.value = true
    message.value = `${result.imported ?? result.newCount ?? 0} événement(s) importé(s), ${result.skipped ?? 0} déjà présent(s) (${result.count} lu(s) dans Google).`
  } catch (error) {
    ok.value = false
    message.value = error.message || 'Import Google impossible.'
  } finally {
    syncing.value = false
  }
}
</script>

<style scoped>
.subscribe-urls {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.subscribe-urls__row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}
.subscribe-urls__row .v-btn {
  margin-top: 4px;
  flex-shrink: 0;
}
</style>

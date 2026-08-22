<template>
  <section class="page-block">
    <h2 class="section-label">Google Agenda</h2>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Les répétitions et sorties du cercle sont synchronisées depuis le calendrier Google public.
      Modifiez les dates dans Google Agenda : elles apparaîtront ici sous ~15 minutes (ou après un sync manuel).
    </p>

    <div class="form-fields-grid form-fields-grid--2">
      <FieldRow label="Identifiant calendrier">
        <v-text-field v-model="draft.googleCalendarId" hide-details hint="Adresse Gmail du calendrier" />
      </FieldRow>
      <FieldRow label="Nom affiché">
        <v-text-field v-model="draft.googleCalendarName" hide-details />
      </FieldRow>
      <FieldRow label="CID (base64)" class="form-fields-grid__span-2" hint="Lien « Ajouter le calendrier » Google">
        <v-text-field v-model="draft.googleCalendarCid" hide-details />
      </FieldRow>
    </div>

    <v-alert v-if="message" :type="ok ? 'success' : 'error'" variant="tonal" class="mt-4">{{ message }}</v-alert>

    <div class="d-flex flex-wrap ga-3 mt-4">
      <v-btn color="primary" :loading="saving" @click="save">Enregistrer</v-btn>
      <v-btn variant="tonal" :loading="syncing" @click="syncNow">Synchroniser maintenant</v-btn>
      <v-btn variant="text" :href="subscribeUrl" target="_blank" rel="noopener noreferrer">Ouvrir dans Google</v-btn>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import FieldRow from '@/components/FieldRow.vue'
import { api } from '@/services/api'
import { googleCalendarSubscribeUrl } from '@/domain/agendaSettings'

const draft = reactive({
  googleCalendarId: '',
  googleCalendarCid: '',
  googleCalendarName: '',
})
const saving = ref(false)
const syncing = ref(false)
const message = ref('')
const ok = ref(false)

const subscribeUrl = computed(() => googleCalendarSubscribeUrl(draft))

onMounted(async () => {
  Object.assign(draft, await api.agendaSettings())
})

async function save() {
  saving.value = true
  message.value = ''
  try {
    Object.assign(draft, await api.updateAgendaSettings({ ...draft }))
    ok.value = true
    message.value = 'Paramètres Google Agenda enregistrés.'
  } catch (error) {
    ok.value = false
    message.value = error.message || 'Enregistrement impossible.'
  } finally {
    saving.value = false
  }
}

async function syncNow() {
  syncing.value = true
  message.value = ''
  try {
    const result = await api.syncAgenda()
    ok.value = true
    message.value = `${result.count} événement(s) récupéré(s) depuis Google Agenda.`
  } catch (error) {
    ok.value = false
    message.value = error.message || 'Synchronisation impossible.'
  } finally {
    syncing.value = false
  }
}
</script>

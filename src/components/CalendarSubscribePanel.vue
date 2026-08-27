<template>
  <div class="calendar-subscribe">
    <p class="calendar-subscribe__intro">
      Un seul abonnement pour Google, Apple ou Outlook. Choisissez tout le calendrier, ou seulement
      certains groupes.
    </p>
    <div class="calendar-subscribe__groups">
      <v-chip
        :color="!selected.length ? 'primary' : undefined"
        :variant="!selected.length ? 'flat' : 'outlined'"
        size="small"
        class="text-none"
        @click="selected = []"
      >
        Tout le calendrier
      </v-chip>
      <v-chip
        v-for="group in groups"
        :key="group.id"
        :color="selected.includes(group.id) ? 'primary' : undefined"
        :variant="selected.includes(group.id) ? 'flat' : 'outlined'"
        size="small"
        class="text-none"
        @click="toggle(group.id)"
      >
        {{ group.label }}
      </v-chip>
    </div>

    <v-alert type="info" variant="tonal" density="compact" class="mt-4 mb-3">
      Google Agenda n’accepte pas le bouton « un clic ». Il faut coller l’adresse https dans les
      paramètres, <strong>sur un ordinateur</strong> (l’application téléphone ne propose pas « À
      partir de l’URL »).
    </v-alert>
    <ol class="calendar-subscribe__steps">
      <li>Copiez l’adresse https ci-dessous.</li>
      <li>Ouvrez Google Agenda sur un ordinateur.</li>
      <li>Paramètres (engrenage) → Ajouter un agenda → À partir de l’URL.</li>
      <li>Collez l’adresse, puis Ajouter un agenda.</li>
    </ol>

    <div class="calendar-subscribe__copy-row">
      <v-text-field
        :model-value="icsUrl"
        label="Adresse à coller dans Google Agenda"
        readonly
        hide-details
        density="comfortable"
        variant="outlined"
      />
      <v-btn color="primary" variant="flat" class="text-none" prepend-icon="mdi-content-copy" @click="copyLink">
        {{ copied ? 'Adresse copiée' : 'Copier l’adresse' }}
      </v-btn>
    </div>
    <div class="d-flex flex-wrap ga-2 mt-3">
      <v-btn
        variant="outlined"
        size="small"
        class="text-none"
        :href="webcalUrl"
        prepend-icon="mdi-calendar-sync"
      >
        Apple / Outlook
      </v-btn>
      <v-btn
        variant="text"
        size="small"
        class="text-none"
        href="https://calendar.google.com/calendar/u/0/r/settings"
        target="_blank"
        rel="noopener noreferrer"
        prepend-icon="mdi-google"
      >
        Ouvrir Google Agenda
      </v-btn>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { appCalendarIcsUrl, appCalendarWebcalUrl } from '@/domain/agendaSettings'
import { selectableEventGroups } from '@/domain/eventCatalog'
import { activeEventGroups } from '@/domain/eventGroups'

const props = defineProps({
  catalog: { type: Object, default: null },
})

const selected = ref([])
const copied = ref(false)
const origin = typeof window === 'undefined' ? '' : window.location.origin

const groups = computed(() =>
  selectableEventGroups(props.catalog || { groups: activeEventGroups() }),
)
const icsUrl = computed(() => appCalendarIcsUrl(origin, selected.value))
const webcalUrl = computed(() => appCalendarWebcalUrl(origin, selected.value))

function toggle(id) {
  if (selected.value.includes(id)) selected.value = selected.value.filter((entry) => entry !== id)
  else selected.value = [...selected.value, id]
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(icsUrl.value)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch {
    copied.value = false
  }
}
</script>

<style scoped>
.calendar-subscribe__intro {
  margin: 0 0 10px;
  font-size: 0.9rem;
  color: rgba(44, 51, 44, 0.72);
  line-height: 1.45;
}

.calendar-subscribe__groups {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.calendar-subscribe__steps {
  margin: 0 0 14px;
  padding-left: 1.2rem;
  font-size: 0.9rem;
  color: rgba(44, 51, 44, 0.78);
  line-height: 1.5;
}

.calendar-subscribe__copy-row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  flex-wrap: wrap;
}

.calendar-subscribe__copy-row .v-text-field {
  flex: 1 1 220px;
}

.calendar-subscribe__copy-row .v-btn {
  margin-top: 4px;
  flex-shrink: 0;
}
</style>

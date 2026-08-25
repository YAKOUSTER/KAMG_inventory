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
    <div class="d-flex flex-wrap ga-2 mt-3">
      <v-btn
        color="primary"
        variant="tonal"
        size="small"
        class="text-none"
        :href="googleUrl"
        target="_blank"
        rel="noopener noreferrer"
        prepend-icon="mdi-google"
      >
        Google Agenda
      </v-btn>
      <v-btn
        variant="outlined"
        size="small"
        class="text-none"
        :href="webcalUrl"
        prepend-icon="mdi-calendar-sync"
      >
        Apple / Outlook
      </v-btn>
      <v-btn variant="text" size="small" class="text-none" prepend-icon="mdi-content-copy" @click="copyLink">
        {{ copied ? 'Lien copié' : 'Copier le lien' }}
      </v-btn>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import {
  appCalendarIcsUrl,
  appCalendarWebcalUrl,
  googleCalendarSubscribeFromIcsUrl,
} from '@/domain/agendaSettings'
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
const googleUrl = computed(() => googleCalendarSubscribeFromIcsUrl(icsUrl.value))

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
</style>

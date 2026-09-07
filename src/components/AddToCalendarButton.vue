<template>
  <div class="calendar-actions d-flex flex-wrap ga-2 mt-3">
    <v-btn
      size="small"
      variant="tonal"
      color="primary"
      class="text-none"
      :href="googleUrl"
      target="_blank"
      rel="noopener noreferrer"
      prepend-icon="mdi-google"
    >
      Google Agenda
    </v-btn>
    <v-btn
      size="small"
      variant="text"
      class="text-none"
      prepend-icon="mdi-download"
      @click="downloadIcs"
    >
      Fichier .ics
    </v-btn>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { googleCalendarAddEventUrl, buildSingleEventIcs } from '@/domain/agendaSettings'

const props = defineProps({
  event: { type: Object, required: true },
})

const googleUrl = computed(() => googleCalendarAddEventUrl(props.event))

function downloadIcs() {
  const blob = new Blob([buildSingleEventIcs(props.event)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${(props.event.titre || 'evenement-kamg').replace(/[^\w\-]+/g, '-').slice(0, 60)}.ics`
  link.click()
  URL.revokeObjectURL(url)
}
</script>

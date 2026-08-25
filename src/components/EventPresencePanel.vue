<template>
  <div class="presence-panel">
    <v-select
      v-model="groupFilter"
      :items="groupItems"
      label="Groupe"
      hide-details
      density="compact"
      class="mb-3"
    />
    <v-autocomplete
      v-model="selectedPersonId"
      :items="personItems"
      :label="publicMode ? 'Votre nom' : 'Personne'"
      hide-details
      density="compact"
      auto-select-first
      class="mb-3"
    />
    <EventRsvpPoll
      :event="event"
      :people="filteredPeople"
      :presences="presences"
      :person-id="selectedPersonId"
      :public-mode="publicMode"
      hide-identity
      show-attendees
      @updated="emit('updated', $event)"
    />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { personDisplayName } from '@/domain/person'
import { PRESENCE_GROUP_FILTERS, filterPeopleForPresence } from '@/domain/presence'
import EventRsvpPoll from '@/components/EventRsvpPoll.vue'

const props = defineProps({
  event: { type: Object, required: true },
  people: { type: Array, default: () => [] },
  presences: { type: Array, default: () => [] },
  publicMode: { type: Boolean, default: false },
})

const emit = defineEmits(['updated'])

const groupFilter = ref('tous')
const selectedPersonId = ref('')
const groupItems = PRESENCE_GROUP_FILTERS.map((group) => ({ title: group.label, value: group.id }))
const filteredPeople = computed(() => filterPeopleForPresence(props.people, groupFilter.value))
const personItems = computed(() =>
  filteredPeople.value.map((person) => ({
    title: personDisplayName(person),
    value: person.id,
  })),
)
</script>

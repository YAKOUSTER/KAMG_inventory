<template>
  <article class="event-poll-card">
    <button type="button" class="event-poll-card__main" @click="emit('select', event)">
      <div class="event-poll-card__date" aria-hidden="true">
        <span class="event-poll-card__weekday">{{ badge.weekday }}</span>
        <span class="event-poll-card__day">{{ badge.day }}</span>
        <span class="event-poll-card__month">{{ badge.month }}</span>
      </div>
      <div class="event-poll-card__body">
        <div class="event-poll-card__chips">
          <EventKindChips :event="event" />
          <v-chip v-if="event.inscriptionsOuvertes" size="x-small" color="deep-orange" variant="tonal">
            Sondage
          </v-chip>
          <v-chip v-if="event.horsCercle" size="x-small" color="secondary" variant="tonal">
            Libre · hors cercle
          </v-chip>
        </div>
        <h3 class="event-poll-card__title">{{ event.titre }}</h3>
        <p class="event-poll-card__meta">
          <span v-if="timeLabel">{{ timeLabel }}</span>
          <span v-if="event.lieu">{{ event.lieu }}</span>
        </p>
      </div>
      <v-icon size="18" class="event-poll-card__chevron">mdi-chevron-right</v-icon>
    </button>
    <EventRsvpPoll
      v-if="eventAcceptsInscriptions(event)"
      class="event-poll-card__poll"
      :event="event"
      :people="people"
      :presences="presences"
      :person-id="personId"
      :public-mode="publicMode"
      hide-identity
      compact
      :readonly="readonly"
      @update:person-id="emit('update:personId', $event)"
      @updated="emit('updated', $event)"
    />
  </article>
</template>

<script setup>
import { computed } from 'vue'
import { eventAcceptsInscriptions } from '@/domain/events'
import { eventDateBadge, eventTimeLabel } from '@/domain/calendarViews'
import EventKindChips from '@/components/EventKindChips.vue'
import EventRsvpPoll from '@/components/EventRsvpPoll.vue'

const props = defineProps({
  event: { type: Object, required: true },
  people: { type: Array, default: () => [] },
  presences: { type: Array, default: () => [] },
  personId: { type: String, default: '' },
  publicMode: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
})

const emit = defineEmits(['select', 'updated', 'update:personId'])

const badge = computed(() => eventDateBadge(props.event))
const timeLabel = computed(() => eventTimeLabel(props.event))
</script>

<style scoped>
.event-poll-card {
  background: #fff;
  border: 1px solid var(--kamg-border);
  border-radius: 16px;
  padding: 10px 10px 12px;
}

.event-poll-card__main {
  display: grid;
  grid-template-columns: 48px 1fr auto;
  gap: 10px;
  width: 100%;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
  align-items: center;
  color: inherit;
  padding: 2px;
}

.event-poll-card__date {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 48px;
  min-height: 58px;
  padding: 6px 2px;
  border-radius: 12px;
  background: rgba(106, 140, 105, 0.14);
  line-height: 1.05;
  color: var(--kamg-deep);
}

.event-poll-card__weekday,
.event-poll-card__month {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.event-poll-card__day {
  font-size: 1.35rem;
  font-weight: 800;
}

.event-poll-card__title {
  margin: 2px 0 4px;
  font-size: 0.98rem;
  line-height: 1.25;
}

.event-poll-card__meta {
  margin: 0;
  font-size: 0.82rem;
  color: rgba(44, 51, 44, 0.68);
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.event-poll-card__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}

.event-poll-card__chevron {
  color: rgba(44, 51, 44, 0.35);
}

.event-poll-card__poll {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid var(--kamg-border);
}
</style>

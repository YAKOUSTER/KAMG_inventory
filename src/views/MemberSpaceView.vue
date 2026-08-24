<template>
  <div class="member-space">
    <header class="member-space__header">
      <router-link to="/espace-membre" class="member-space__brand">
        <img :src="LOGO_SRC" :alt="GROUP_NAME" class="member-space__logo" />
        <div>
          <div class="member-space__eyebrow">{{ GROUP_NAME }}</div>
          <h1 class="member-space__title">Espace membres</h1>
        </div>
      </router-link>
      <v-btn variant="text" size="small" class="text-none" to="/connexion">Accès gestion</v-btn>
    </header>

    <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-4" />

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert>

    <template v-if="data">
      <v-tabs v-model="tab" color="primary" class="member-space__tabs" grow>
        <v-tab value="agenda" class="text-none">Agenda</v-tab>
        <v-tab value="infos" class="text-none">Infos & tutos</v-tab>
        <v-tab value="emprunts" class="text-none">Emprunts</v-tab>
      </v-tabs>

      <v-tabs-window v-model="tab" class="member-space__panels">
        <v-tabs-window-item value="agenda">
          <section class="member-section member-section--subscribe">
            <h2 class="member-section__title">Calendrier du cercle</h2>
            <p class="member-section__intro">
              Dates gérées dans l’application. Abonnez-vous pour que Google Agenda ou l’iPhone
              se mettent à jour automatiquement.
            </p>
            <div class="d-flex flex-wrap ga-2 mb-4">
              <v-btn
                color="primary"
                variant="tonal"
                size="small"
                class="text-none"
                :href="googleSubscribeUrl"
                target="_blank"
                rel="noopener noreferrer"
                prepend-icon="mdi-google"
              >
                Ajouter à Google Agenda
              </v-btn>
              <v-btn
                variant="outlined"
                size="small"
                class="text-none"
                :href="icalSubscribeUrl"
                prepend-icon="mdi-calendar-sync"
              >
                S’abonner (Apple / Outlook)
              </v-btn>
            </div>

            <div class="member-group-filters d-flex flex-wrap ga-2 mb-4">
              <v-chip
                v-for="group in eventGroups"
                :key="group.id"
                :color="groupFilter === group.id ? 'primary' : undefined"
                :variant="groupFilter === group.id ? 'flat' : 'outlined'"
                size="small"
                class="text-none"
                @click="groupFilter = group.id"
              >
                {{ group.label }}
              </v-chip>
            </div>

            <AgendaCalendar
              :events="calendarEvents"
              storage-key="kamg-agenda-member"
              @select="openMemberEvent"
            />
          </section>

          <section
            v-if="inscriptionEvents.length"
            id="inscriptions-sorties"
            class="member-section"
          >
            <h2 class="member-section__title">S’inscrire aux sorties</h2>
            <p class="member-section__intro">
              Indiquez si vous serez présent (1), absent (0) ou peut-être (?) — une colonne par date,
              comme l’ancien tableur Excel. Choisissez votre nom, puis passez de case en case.
            </p>
            <PresenceGrid
              :events="inscriptionEvents"
              :people="data.people || []"
              :presences="data.presences || []"
              public-mode
              @updated="onPresenceUpdated"
            />
          </section>
        </v-tabs-window-item>

        <v-tabs-window-item value="infos">
          <MemberBlogPanel v-if="infosVisited" :pages="data.pages" />
        </v-tabs-window-item>

        <v-tabs-window-item value="emprunts">
          <section v-if="empruntsVisited" class="member-section">
            <h2 class="member-section__title">Emprunts en cours</h2>
            <p class="member-section__intro">
              Pièces actuellement sorties du patrimoine du cercle (spectacles, répétitions, etc.).
            </p>
            <div v-if="data.loans.length" class="member-stack">
              <article v-for="loan in data.loans" :key="loan.id" class="member-card">
                <div class="member-card__head">
                  <v-chip size="small" :color="loanStatusColor(loan.statut)" variant="tonal">
                    {{ loanStatusLabel(loan.statut) }}
                  </v-chip>
                  <time class="member-card__date">{{ displayDate(loan.dateEmprunt) }}</time>
                </div>
                <h3 class="member-card__title">{{ loan.titre }}</h3>
                <p class="member-card__meta">{{ loan.personName }}</p>
                <ul class="member-loan-items">
                  <li v-for="line in openLoanLines(loan)" :key="line.itemId">
                    {{ line.code }} — {{ line.nom }}
                  </li>
                </ul>
                <p v-if="loan.dateRetourPrevue" class="member-card__meta">
                  Retour prévu : {{ displayDate(loan.dateRetourPrevue) }}
                </p>
              </article>
            </div>
            <v-alert v-else type="info" variant="tonal">Aucun emprunt en cours.</v-alert>
          </section>
        </v-tabs-window-item>
      </v-tabs-window>
    </template>

    <v-dialog v-model="eventDialog" max-width="520">
      <v-card v-if="selectedEvent" class="pa-2">
        <v-card-title class="text-wrap">{{ selectedEvent.titre }}</v-card-title>
        <v-card-text>
          <div class="d-flex flex-wrap ga-1 mb-3">
            <v-chip size="small" :color="eventTypeMeta(selectedEvent.type).color" variant="tonal">
              {{ eventTypeLabel(selectedEvent.type) }}
            </v-chip>
            <v-chip
              v-for="group in selectedEvent.groupes || []"
              :key="group"
              size="x-small"
              variant="outlined"
            >
              {{ eventGroupLabel(group) }}
            </v-chip>
          </div>
          <p class="mb-1"><strong>{{ displayDateTime(selectedEvent.debut) }}</strong></p>
          <p v-if="selectedEvent.lieu" class="mb-2">{{ selectedEvent.lieu }}</p>
          <p v-if="selectedEvent.description" class="text-body-2" style="white-space: pre-wrap">
            {{ selectedEvent.description }}
          </p>
          <AddToCalendarButton :event="selectedEvent" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" class="text-none" @click="eventDialog = false">Fermer</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/services/api'
import { GROUP_NAME, LOGO_SRC } from '@/domain/brand'
import { displayDate, displayDateTime } from '@/domain/dates'
import { eventTypeLabel, eventTypeMeta, eventAcceptsInscriptions } from '@/domain/events'
import { loanStatusColor, loanStatusLabel, openLoanLines } from '@/domain/loans'
import { EVENT_GROUPS, eventGroupLabel, filterEventsByGroup } from '@/domain/eventGroups'
import { applyPresenceUpdate } from '@/domain/presence'
import {
  appCalendarIcsUrl,
  appCalendarWebcalUrl,
  googleCalendarSubscribeFromIcsUrl,
} from '@/domain/agendaSettings'
import AddToCalendarButton from '@/components/AddToCalendarButton.vue'
import MemberBlogPanel from '@/components/MemberBlogPanel.vue'
import AgendaCalendar from '@/components/AgendaCalendar.vue'
import PresenceGrid from '@/components/PresenceGrid.vue'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const error = ref('')
const data = ref(null)
const tab = ref(route.query.onglet || 'agenda')
const groupFilter = ref('tous')
const infosVisited = ref(route.query.onglet === 'infos')
const empruntsVisited = ref(route.query.onglet === 'emprunts')
const selectedEvent = ref(null)
const eventDialog = ref(false)

const eventGroups = EVENT_GROUPS
const origin = typeof window === 'undefined' ? '' : window.location.origin
const googleSubscribeUrl = computed(() => googleCalendarSubscribeFromIcsUrl(appCalendarIcsUrl(origin)))
const icalSubscribeUrl = computed(() => appCalendarWebcalUrl(origin))

const allEvents = computed(() => [
  ...(data.value?.events?.upcoming || []),
  ...(data.value?.events?.past || []),
])
const calendarEvents = computed(() => filterEventsByGroup(allEvents.value, groupFilter.value))
const inscriptionEvents = computed(() =>
  (data.value?.events?.upcoming || []).filter((event) => eventAcceptsInscriptions(event)),
)

watch(tab, (value) => {
  if (value === 'infos') infosVisited.value = true
  if (value === 'emprunts') empruntsVisited.value = true
  const query = { ...route.query, onglet: value }
  if (value !== 'agenda') delete query.inscriptions
  router.replace({ query }).catch(() => {})
})

watch(
  () => route.query.onglet,
  (value) => {
    if (value && value !== tab.value) tab.value = value
  },
)

watch(
  () => route.query.inscriptions,
  (value) => {
    if (value === '1') {
      tab.value = 'agenda'
      requestAnimationFrame(() => {
        document.getElementById('inscriptions-sorties')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  },
  { immediate: true },
)

onMounted(async () => {
  try {
    data.value = await api.publicMemberSpace()
  } catch (err) {
    error.value = err.message || 'Impossible de charger l’espace membres.'
  } finally {
    loading.value = false
  }
})

function onPresenceUpdated(record) {
  if (!data.value) return
  data.value = { ...data.value, presences: applyPresenceUpdate(data.value.presences, record) }
}

function openMemberEvent(event) {
  selectedEvent.value = event
  eventDialog.value = true
}
</script>

<style scoped>
.member-space {
  max-width: 1280px;
  margin: 0 auto;
  padding: 20px 16px 40px;
}

.member-space__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.member-space__brand {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  color: inherit;
  min-width: 0;
}

.member-space__logo {
  width: 52px;
  height: 52px;
  object-fit: contain;
}

.member-space__eyebrow {
  font-size: 0.78rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(44, 51, 44, 0.62);
}

.member-space__title {
  font-size: 1.35rem;
  line-height: 1.2;
  margin: 0;
}

.member-space__tabs {
  margin-bottom: 16px;
}

.member-section {
  margin-bottom: 24px;
}

.member-section__title {
  font-size: 1rem;
  font-weight: 700;
  margin: 0 0 12px;
}

.member-section__intro {
  color: rgba(44, 51, 44, 0.72);
  margin: 0 0 12px;
}

.member-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.member-card {
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(83, 115, 106, 0.16);
  border-radius: 14px;
  padding: 14px 16px;
}

.member-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.member-card__date {
  font-size: 0.82rem;
  color: rgba(44, 51, 44, 0.62);
}

.member-card__title {
  font-size: 1.02rem;
  margin: 0 0 4px;
}

.member-card__meta {
  margin: 0;
  font-size: 0.92rem;
  color: rgba(44, 51, 44, 0.72);
}

.member-loan-items {
  margin: 8px 0;
  padding-left: 1.1rem;
}

.member-group-filters {
  overflow-x: auto;
  padding-bottom: 2px;
}
</style>

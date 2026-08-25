<template>
  <div class="member-space" :class="{ 'member-space--mobile': !mdAndUp }">
    <header class="member-space__header">
      <router-link to="/espace-membre" class="member-space__brand">
        <img :src="LOGO_SRC" :alt="GROUP_NAME" class="member-space__logo" />
        <div>
          <div class="member-space__eyebrow">{{ GROUP_NAME }}</div>
          <h1 class="member-space__title">Espace membres</h1>
        </div>
      </router-link>
      <div class="member-space__actions">
        <v-btn
          v-if="canOpenGestion"
          variant="tonal"
          size="small"
          class="text-none"
          prepend-icon="mdi-briefcase-outline"
          to="/"
        >
          Gestion
        </v-btn>
        <v-btn variant="text" size="small" class="text-none" @click="logout">
          Déconnexion
        </v-btn>
      </div>
    </header>

    <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-3" />
    <v-alert v-if="error" type="error" variant="tonal" class="mb-3">{{ error }}</v-alert>

    <section v-if="pending" class="member-waiting">
      <h2>Inscription reçue</h2>
      <p>
        Votre compte est en attente de rangement par le bureau : groupe de danse, fiche, ou lien avec les
        enfants. Vous pourrez répondre aux sondages ensuite.
      </p>
      <p v-if="auth.user?.signup?.childrenNames" class="text-body-2">
        Enfant(s) indiqué(s) : {{ auth.user.signup.childrenNames }}
      </p>
    </section>

    <template v-else-if="data">
      <v-tabs v-if="mdAndUp" v-model="tab" color="primary" class="member-space__tabs" density="compact">
        <v-tab value="accueil" class="text-none">Accueil</v-tab>
        <v-tab value="agenda" class="text-none">Agenda</v-tab>
        <v-tab value="infos" class="text-none">Infos & tutos</v-tab>
        <v-tab value="emprunts" class="text-none">Emprunts</v-tab>
      </v-tabs>

      <div v-show="tab === 'accueil'" class="member-space__panel">
        <MemberHomePanel
          :events="data.events?.upcoming || []"
          :pages="data.pages || []"
          :people="data.people || []"
          :presences="data.presences || []"
          :person-id="selectedPersonId"
          @open-agenda="openAgendaTab"
          @open-news="openNewsTab"
          @open-article="openArticle"
          @select-event="openMemberEvent"
          @updated="onPresenceUpdated"
        />
      </div>

      <div v-show="tab === 'agenda'" class="member-space__panel">
        <div class="member-space__toolbar">
          <v-btn-toggle v-model="agendaMode" density="compact" variant="outlined" divided mandatory>
            <v-btn value="events" class="text-none" size="small">À venir</v-btn>
            <v-btn value="calendar" class="text-none" size="small">Calendrier</v-btn>
          </v-btn-toggle>
          <v-select
            v-if="personItems.length > 1"
            v-model="selectedPersonId"
            :items="personItems"
            label="Répondre pour"
            hide-details
            density="compact"
            class="member-space__who"
          />
          <p v-else-if="personItems.length === 1" class="member-space__who-label">
            {{ personItems[0].title }}
          </p>
        </div>

        <details class="member-space__subscribe">
          <summary>S’abonner au calendrier</summary>
          <div class="d-flex flex-wrap ga-2 mt-2">
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
              Google Agenda
            </v-btn>
            <v-btn
              variant="outlined"
              size="small"
              class="text-none"
              :href="icalSubscribeUrl"
              prepend-icon="mdi-calendar-sync"
            >
              Apple / Outlook
            </v-btn>
          </div>
        </details>

        <div class="member-group-filters">
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

        <section v-show="agendaMode === 'events'" id="inscriptions-sorties" class="member-section">
          <div v-if="upcomingCards.length" class="event-poll-list">
            <EventPollCard
              v-for="event in upcomingCards"
              :key="event.id"
              :event="event"
              :people="data.people || []"
              :presences="data.presences || []"
              :person-id="selectedPersonId"
              public-mode
              :readonly="!selectedPersonId"
              @select="openMemberEvent"
              @updated="onPresenceUpdated"
            />
          </div>
          <v-alert v-else type="info" variant="tonal">Aucun événement à venir pour ce filtre.</v-alert>
        </section>

        <section v-show="agendaMode === 'calendar'" class="member-section">
          <AgendaCalendar
            :events="calendarEvents"
            storage-key="kamg-agenda-member"
            @select="openMemberEvent"
          />
        </section>
      </div>

      <div v-if="infosVisited" v-show="tab === 'infos'" class="member-space__panel">
        <MemberBlogPanel :pages="data.pages" />
      </div>

      <div v-if="empruntsVisited" v-show="tab === 'emprunts'" class="member-space__panel">
        <section class="member-section">
          <h2 class="member-section__title">Emprunts en cours</h2>
          <p class="member-section__intro">
            Pièces actuellement sorties du patrimoine du cercle.
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
      </div>
    </template>

    <BottomTabBar
      v-if="!mdAndUp && !pending"
      :items="memberTabs"
      :active-id="tab"
      label="Espace membres"
      @select="tab = $event"
    />

    <v-dialog v-model="eventDialog" :fullscreen="!mdAndUp" max-width="760" scrollable>
      <v-card v-if="selectedEvent">
        <v-card-title class="event-dialog__title">
          <span class="event-dialog__heading">{{ selectedEvent.titre }}</span>
          <v-btn icon variant="text" aria-label="Fermer" @click="closeMemberEvent">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text>
          <div class="d-flex flex-wrap ga-1 mb-3">
            <EventKindChips :event="selectedEvent" size="small" />
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
          <EventRsvpPoll
            v-if="eventAcceptsInscriptions(selectedEvent)"
            class="mb-4"
            :event="selectedEvent"
            :people="data?.people || []"
            :presences="data?.presences || []"
            :person-id="selectedPersonId"
            public-mode
            hide-identity
            show-attendees
            :readonly="!selectedPersonId"
            @updated="onPresenceUpdated"
          />
          <SortieFiche
            v-if="showSortieFiche"
            class="mt-4"
            :titre="selectedEvent.titre"
            :debut="selectedEvent.debut"
            :lieu="selectedEvent.lieu"
            :sortie="selectedEvent.sortie || emptySortie()"
            :dancer-count="selectedDancerCount"
          />
          <AddToCalendarButton :event="selectedEvent" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" class="text-none" @click="closeMemberEvent">Fermer</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDisplay } from 'vuetify'
import { api } from '@/services/api'
import { GROUP_NAME, LOGO_SRC } from '@/domain/brand'
import { displayDate, displayDateTime } from '@/domain/dates'
import { eventAcceptsInscriptions, eventIsSortie } from '@/domain/events'
import { emptySortie, sortieHasContent } from '@/domain/sortie'
import { loanStatusColor, loanStatusLabel, openLoanLines } from '@/domain/loans'
import { EVENT_GROUPS, eventGroupLabel, filterEventsByGroup } from '@/domain/eventGroups'
import {
  applyPresenceUpdate,
  readStoredPresencePersonId,
  storePresencePersonId,
  summarizePresences,
} from '@/domain/presence'
import { personDisplayName } from '@/domain/person'
import {
  appCalendarIcsUrl,
  appCalendarWebcalUrl,
  googleCalendarSubscribeFromIcsUrl,
} from '@/domain/agendaSettings'
import AddToCalendarButton from '@/components/AddToCalendarButton.vue'
import MemberBlogPanel from '@/components/MemberBlogPanel.vue'
import MemberHomePanel from '@/components/MemberHomePanel.vue'
import AgendaCalendar from '@/components/AgendaCalendar.vue'
import EventKindChips from '@/components/EventKindChips.vue'
import EventPollCard from '@/components/EventPollCard.vue'
import EventRsvpPoll from '@/components/EventRsvpPoll.vue'
import SortieFiche from '@/components/SortieFiche.vue'
import BottomTabBar from '@/components/BottomTabBar.vue'
import { useAuthStore } from '@/stores/auth'
import { canAccessGestion } from '@/domain/gestionNav'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const display = useDisplay()
const mdAndUp = computed(() => display.mdAndUp.value)
const canOpenGestion = computed(() => canAccessGestion(auth.user))
const loading = ref(true)
const error = ref('')
const pending = ref(false)
const data = ref(null)
const tab = ref(route.query.onglet || 'accueil')
const agendaMode = ref('events')
const groupFilter = ref('tous')
const selectedPersonId = ref('')
const infosVisited = ref(route.query.onglet === 'infos')
const empruntsVisited = ref(route.query.onglet === 'emprunts')
const selectedEvent = ref(null)
const eventDialog = ref(false)

const eventGroups = EVENT_GROUPS
const origin = typeof window === 'undefined' ? '' : window.location.origin
const googleSubscribeUrl = computed(() => googleCalendarSubscribeFromIcsUrl(appCalendarIcsUrl(origin)))
const icalSubscribeUrl = computed(() => appCalendarWebcalUrl(origin))
const memberTabs = [
  { id: 'accueil', label: 'Accueil', icon: 'mdi-home-outline', activeIcon: 'mdi-home' },
  { id: 'agenda', label: 'Agenda', icon: 'mdi-calendar-month-outline', activeIcon: 'mdi-calendar-month' },
  { id: 'infos', label: 'Infos', icon: 'mdi-book-open-page-variant-outline', activeIcon: 'mdi-book-open-page-variant' },
  { id: 'emprunts', label: 'Emprunts', icon: 'mdi-swap-horizontal' },
]

const allEvents = computed(() => [
  ...(data.value?.events?.upcoming || []),
  ...(data.value?.events?.past || []),
])
const calendarEvents = computed(() => filterEventsByGroup(allEvents.value, groupFilter.value))
const upcomingCards = computed(() =>
  filterEventsByGroup(data.value?.events?.upcoming || [], groupFilter.value),
)
const personItems = computed(() =>
  (data.value?.profiles || []).map((person) => ({
    title: personDisplayName(person),
    value: person.id,
  })),
)
const showSortieFiche = computed(
  () => eventIsSortie(selectedEvent.value) && sortieHasContent(selectedEvent.value?.sortie),
)
const selectedDancerCount = computed(() => {
  if (!selectedEvent.value || !data.value) return 0
  return summarizePresences(data.value.presences, selectedEvent.value.id).present
})

watch(tab, (value) => {
  if (value === 'infos') infosVisited.value = true
  if (value === 'emprunts') empruntsVisited.value = true
  const query = { ...route.query, onglet: value }
  if (value !== 'agenda') delete query.inscriptions
  if (value !== 'infos') {
    delete query.article
    delete query.categorie
  }
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
      agendaMode.value = 'events'
      requestAnimationFrame(() => {
        document.getElementById('inscriptions-sorties')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  },
  { immediate: true },
)

watch(selectedPersonId, (value) => storePresencePersonId(value))

onMounted(async () => {
  try {
    const payload = await api.publicMemberSpace()
    pending.value = Boolean(payload.pending)
    if (payload.pending) {
      data.value = null
      return
    }
    data.value = payload
    const stored = readStoredPresencePersonId(payload.profiles || [])
    selectedPersonId.value = stored || payload.profiles?.[0]?.id || ''
  } catch (err) {
    error.value = err.message || 'Impossible de charger l’espace membres.'
  } finally {
    loading.value = false
  }
})

async function logout() {
  await auth.logout()
  router.push({ name: 'login' })
}

function onPresenceUpdated(record) {
  if (!data.value) return
  data.value = { ...data.value, presences: applyPresenceUpdate(data.value.presences, record) }
}

function openAgendaTab() {
  tab.value = 'agenda'
  agendaMode.value = 'events'
}

function openNewsTab() {
  infosVisited.value = true
  tab.value = 'infos'
  router.replace({ query: { ...route.query, onglet: 'infos', categorie: 'newsletter' } }).catch(() => {})
}

function openArticle(id) {
  infosVisited.value = true
  tab.value = 'infos'
  router.replace({ query: { ...route.query, onglet: 'infos', article: id } }).catch(() => {})
}

function openMemberEvent(event) {
  selectedEvent.value = event
  eventDialog.value = true
}

function closeMemberEvent() {
  eventDialog.value = false
}
</script>

<style scoped>
.member-space {
  max-width: 1280px;
  margin: 0 auto;
  padding: 12px 16px 24px;
}

.member-space--mobile {
  padding: 8px 12px calc(72px + env(safe-area-inset-bottom, 0px));
}

.member-space__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}

.member-space__brand {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: inherit;
  min-width: 0;
}

.member-space__logo {
  width: 36px;
  height: 36px;
  object-fit: contain;
}

.member-space__eyebrow {
  font-size: 0.68rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(44, 51, 44, 0.62);
  line-height: 1.2;
}

.member-space__title {
  font-size: 1.05rem;
  line-height: 1.2;
  margin: 0;
}

.member-space--mobile .member-space__eyebrow {
  display: none;
}

.member-space__tabs {
  margin-bottom: 12px;
}

.member-space__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 10px;
}

.member-space__who {
  flex: 1;
  min-width: min(100%, 220px);
}

.member-space__subscribe {
  margin-bottom: 10px;
  font-size: 0.88rem;
}

.member-space__subscribe summary {
  cursor: pointer;
  font-weight: 600;
  color: var(--kamg-deep);
}

.member-group-filters {
  display: flex;
  flex-wrap: nowrap;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 8px;
  margin-bottom: 8px;
}

.event-poll-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.event-dialog__title {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  white-space: normal;
}

.event-dialog__heading {
  flex: 1;
  min-width: 0;
  line-height: 1.25;
}

.member-section {
  margin-bottom: 16px;
}

.member-section__title {
  font-size: 1rem;
  font-weight: 700;
  margin: 0 0 8px;
}

.member-section__intro {
  color: rgba(44, 51, 44, 0.72);
  margin: 0 0 10px;
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

@media (min-width: 960px) {
  .member-space {
    padding: 16px 24px 40px;
  }

  .member-space__logo {
    width: 44px;
    height: 44px;
  }

  .member-space__title {
    font-size: 1.2rem;
  }

  .member-space__login {
    display: none;
  }
}

.member-space__actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.member-space__who-label {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
}

.member-waiting {
  background: #fff;
  border: 1px solid var(--kamg-border);
  border-radius: 16px;
  padding: 20px 18px;
  max-width: 560px;
}

.member-waiting h2 {
  margin: 0 0 8px;
  font-size: 1.15rem;
}

.member-waiting p {
  margin: 0 0 8px;
  color: rgba(44, 51, 44, 0.72);
  line-height: 1.45;
}
</style>

<template>
  <div class="member-space" :class="{ 'member-space--mobile': !mdAndUp }">
    <header v-if="mdAndUp" class="member-space__header">
      <router-link to="/espace-membre" class="member-space__brand">
        <img :src="LOGO_SRC" :alt="GROUP_NAME" class="member-space__logo" />
        <div>
          <div class="member-space__eyebrow">{{ GROUP_NAME }}</div>
          <h1 class="member-space__title">Espace membres</h1>
          <p v-if="memberDisplayName" class="member-space__user">{{ memberDisplayName }}</p>
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
      <h2>Demande reçue</h2>
      <p>
        Votre demande pour rejoindre l'espace membre a bien été reçue. Celle-ci va être traitée par le
        conseil d'administration. Vous pourrez répondre aux sondages ensuite et accéder à l'actualité du
        cercle.
      </p>
      <p v-if="auth.user?.signup?.childrenNames" class="text-body-2">
        Enfant(s) indiqué(s) : {{ auth.user.signup.childrenNames }}
      </p>
      <v-btn v-if="!mdAndUp" variant="tonal" class="text-none mt-2" @click="logout">
        Déconnexion
      </v-btn>
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
          <v-btn
            v-if="canSubscribe"
            variant="tonal"
            size="small"
            class="text-none"
            prepend-icon="mdi-calendar-sync"
            @click="subscribeOpen = true"
          >
            S’abonner
          </v-btn>
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
      :active-id="accountOpen ? 'moi' : tab"
      label="Espace membres"
      @select="onMemberTab"
    />

    <v-bottom-sheet v-model="accountOpen" class="kamg-account-sheet">
      <v-list class="kamg-sheet-list pa-2 bg-surface">
        <v-list-item :title="memberDisplayName || 'Compte'" :subtitle="GROUP_NAME" />
        <v-list-item
          v-if="canOpenGestion"
          title="Gestion"
          prepend-icon="mdi-briefcase-outline"
          to="/"
          @click="accountOpen = false"
        />
        <v-list-item title="Déconnexion" prepend-icon="mdi-logout" @click="onAccountLogout" />
      </v-list>
    </v-bottom-sheet>

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
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" class="text-none" @click="closeMemberEvent">Fermer</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog v-model="subscribeOpen" max-width="560" scrollable>
      <v-card>
        <v-card-title class="d-flex align-center">
          S’abonner au calendrier
          <v-spacer />
          <v-btn icon variant="text" aria-label="Fermer" @click="subscribeOpen = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text>
          <CalendarSubscribePanel :catalog="data?.eventCatalog" />
        </v-card-text>
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
import { eventGroupLabel, filterEventsByGroup, activeEventGroups } from '@/domain/eventGroups'
import { applyEventCatalog } from '@/domain/eventCatalog'
import {
  applyPresenceUpdate,
  readStoredPresencePersonId,
  storePresencePersonId,
  summarizePresences,
} from '@/domain/presence'
import { personDisplayName } from '@/domain/person'
import CalendarSubscribePanel from '@/components/CalendarSubscribePanel.vue'
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
const memberDisplayName = computed(() => String(auth.user?.nom || auth.user?.login || '').trim())
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
const subscribeOpen = ref(false)
const accountOpen = ref(false)

const eventGroups = computed(() => activeEventGroups())
const canSubscribe = computed(() => Boolean(data.value))
const memberTabs = [
  { id: 'accueil', label: 'Accueil', icon: 'mdi-home-outline', activeIcon: 'mdi-home' },
  { id: 'agenda', label: 'Agenda', icon: 'mdi-calendar-month-outline', activeIcon: 'mdi-calendar-month' },
  { id: 'infos', label: 'Infos', icon: 'mdi-book-open-page-variant-outline', activeIcon: 'mdi-book-open-page-variant' },
  { id: 'emprunts', label: 'Emprunts', icon: 'mdi-swap-horizontal' },
  { id: 'moi', label: 'Moi', icon: 'mdi-account-outline', activeIcon: 'mdi-account' },
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
  if (!value || value === 'moi') return
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
    if (value && value !== 'moi' && value !== tab.value) tab.value = value
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
    applyEventCatalog(payload.eventCatalog)
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

function onMemberTab(id) {
  if (id === 'moi') {
    accountOpen.value = true
    return
  }
  accountOpen.value = false
  tab.value = id
}

async function onAccountLogout() {
  accountOpen.value = false
  await logout()
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
  font-size: 1.15rem;
  font-weight: 800;
  line-height: 1.15;
  margin: 0;
  letter-spacing: -0.03em;
  color: var(--kamg-ink);
}

.member-space__user {
  margin: 2px 0 0;
  font-size: 0.82rem;
  font-weight: 600;
  color: rgba(44, 51, 44, 0.72);
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
  font-size: 1.15rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  margin: 0 0 8px;
  color: var(--kamg-ink);
  background: none;
  padding: 0;
  border-radius: 0;
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
  background: #fff;
  border: 1px solid var(--kamg-border);
  border-radius: var(--kamg-radius);
  box-shadow: var(--kamg-shadow);
  padding: 16px;
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
    font-size: 1.4rem;
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
  border-radius: var(--kamg-radius);
  box-shadow: var(--kamg-shadow);
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

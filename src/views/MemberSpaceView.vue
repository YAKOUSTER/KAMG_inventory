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
              Dates synchronisées depuis Google Agenda (répétitions, sorties, stages…).
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
          </section>

          <section class="member-section">
            <h2 class="member-section__title">À venir</h2>
            <div v-if="filteredUpcoming.length" class="member-stack">
              <article v-for="event in filteredUpcoming" :key="event.id" class="member-card">
                <div class="member-card__head">
                  <div class="d-flex flex-wrap ga-1 align-center">
                    <v-chip size="small" :color="eventTypeMeta(event.type).color" variant="tonal">
                      {{ eventTypeLabel(event.type) }}
                    </v-chip>
                    <v-chip
                      v-for="group in event.groupes || []"
                      :key="`${event.id}-${group}`"
                      size="x-small"
                      variant="outlined"
                    >
                      {{ eventGroupLabel(group) }}
                    </v-chip>
                  </div>
                  <time class="member-card__date">{{ displayDateTime(event.debut) }}</time>
                </div>
                <h3 class="member-card__title">{{ event.titre }}</h3>
                <p v-if="event.lieu" class="member-card__meta">{{ event.lieu }}</p>
                <p v-if="event.description" class="member-card__body">{{ event.description }}</p>
                <AddToCalendarButton :event="event" />
              </article>
            </div>
            <v-alert v-else type="info" variant="tonal">Aucun événement à venir pour ce filtre.</v-alert>
          </section>

          <section v-if="filteredPast.length" class="member-section">
            <h2 class="member-section__title">Récemment passés</h2>
            <div class="member-stack">
              <article v-for="event in filteredPast" :key="event.id" class="member-card member-card--muted">
                <div class="member-card__head">
                  <v-chip size="small" variant="tonal">{{ eventTypeLabel(event.type) }}</v-chip>
                  <time class="member-card__date">{{ displayDateTime(event.debut) }}</time>
                </div>
                <h3 class="member-card__title">{{ event.titre }}</h3>
                <p v-if="event.lieu" class="member-card__meta">{{ event.lieu }}</p>
              </article>
            </div>
          </section>
        </v-tabs-window-item>

        <v-tabs-window-item value="infos">
          <MemberBlogPanel v-if="data.pages?.length" :pages="data.pages" />
          <v-alert v-else type="info" variant="tonal">Aucun contenu publié pour le moment.</v-alert>
        </v-tabs-window-item>

        <v-tabs-window-item value="emprunts">
          <section class="member-section">
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
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/services/api'
import { GROUP_NAME, LOGO_SRC } from '@/domain/brand'
import { displayDate, displayDateTime } from '@/domain/dates'
import { eventTypeLabel, eventTypeMeta } from '@/domain/events'
import { loanStatusColor, loanStatusLabel, openLoanLines } from '@/domain/loans'
import { EVENT_GROUPS, eventGroupLabel, filterEventsByGroup } from '@/domain/eventGroups'
import { googleCalendarSubscribeUrl, googleCalendarIcalSubscribeUrl } from '@/domain/agendaSettings'
import AddToCalendarButton from '@/components/AddToCalendarButton.vue'
import MemberBlogPanel from '@/components/MemberBlogPanel.vue'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const error = ref('')
const data = ref(null)
const tab = ref(route.query.onglet || 'agenda')
const groupFilter = ref('tous')

const eventGroups = EVENT_GROUPS
const googleSubscribeUrl = computed(() => googleCalendarSubscribeUrl(data.value?.agenda || {}))
const icalSubscribeUrl = computed(() => googleCalendarIcalSubscribeUrl(data.value?.agenda || {}))
const filteredUpcoming = computed(() =>
  filterEventsByGroup(data.value?.events?.upcoming || [], groupFilter.value),
)
const filteredPast = computed(() => filterEventsByGroup(data.value?.events?.past || [], groupFilter.value))

watch(tab, (value) => {
  router.replace({ query: { ...route.query, onglet: value } }).catch(() => {})
})

onMounted(async () => {
  try {
    data.value = await api.publicMemberSpace()
  } catch (err) {
    error.value = err.message || 'Impossible de charger l’espace membres.'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.member-space {
  max-width: 920px;
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

.member-card--muted {
  opacity: 0.82;
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

.member-card__body {
  margin: 8px 0 0;
  white-space: pre-wrap;
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

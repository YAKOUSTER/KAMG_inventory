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
          <section class="member-section">
            <h2 class="member-section__title">À venir</h2>
            <div v-if="data.events.upcoming.length" class="member-stack">
              <article v-for="event in data.events.upcoming" :key="event.id" class="member-card">
                <div class="member-card__head">
                  <v-chip size="small" :color="eventTypeMeta(event.type).color" variant="tonal">
                    {{ eventTypeLabel(event.type) }}
                  </v-chip>
                  <time class="member-card__date">{{ displayDateTime(event.debut) }}</time>
                </div>
                <h3 class="member-card__title">{{ event.titre }}</h3>
                <p v-if="event.lieu" class="member-card__meta">{{ event.lieu }}</p>
                <p v-if="event.description" class="member-card__body">{{ event.description }}</p>
              </article>
            </div>
            <v-alert v-else type="info" variant="tonal">Aucun événement à venir pour le moment.</v-alert>
          </section>

          <section v-if="data.events.past.length" class="member-section">
            <h2 class="member-section__title">Récemment passés</h2>
            <div class="member-stack">
              <article v-for="event in data.events.past" :key="event.id" class="member-card member-card--muted">
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
          <section v-for="group in pageGroups" :key="group.id" class="member-section">
            <h2 class="member-section__title">
              <v-icon start>{{ group.icon }}</v-icon>
              {{ group.label }}
            </h2>
            <v-expansion-panels variant="accordion" class="member-panels">
              <v-expansion-panel v-for="page in group.pages" :key="page.id" :title="page.titre">
                <v-expansion-panel-text>
                  <div class="member-content-body">{{ page.corps }}</div>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
          </section>
          <v-alert v-if="!pageGroups.length" type="info" variant="tonal">Aucun contenu publié pour le moment.</v-alert>
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
import { groupPagesByCategory } from '@/domain/content'
import { loanStatusColor, loanStatusLabel, openLoanLines } from '@/domain/loans'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const error = ref('')
const data = ref(null)
const tab = ref(route.query.onglet || 'agenda')

const pageGroups = computed(() => (data.value ? groupPagesByCategory(data.value.pages) : []))

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

.member-content-body {
  white-space: pre-wrap;
  line-height: 1.55;
}

.member-loan-items {
  margin: 8px 0;
  padding-left: 1.1rem;
}

.member-panels :deep(.v-expansion-panel-title) {
  font-weight: 600;
}
</style>

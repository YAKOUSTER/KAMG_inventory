<template>
  <div>
    <div class="d-flex flex-wrap align-center ga-3 page-header">
      <h1 class="text-h4 page-title">Accueil</h1>
      <v-spacer />
      <v-btn v-if="auth.can('items.create')" color="primary" to="/pieces/nouvelle" prepend-icon="mdi-plus">
        Nouvelle fiche
      </v-btn>
    </div>

    <div class="stats">
      <router-link v-for="card in cards" :key="card.label" :to="card.to" class="stat">
        <div class="text-h5 font-weight-bold">{{ card.value }}</div>
        <div class="text-body-2 text-medium-emphasis">{{ card.label }}</div>
      </router-link>
    </div>

    <div class="d-flex flex-wrap" style="gap: 3rem">
      <section class="flex-grow-1" style="min-width: 260px">
        <div class="section-label">Dernières pièces</div>
        <v-list v-if="recent.length" lines="two" class="pa-0">
          <v-list-item
            v-for="item in recent"
            :key="item.id"
            :to="{ name: 'item-detail', params: { id: item.id } }"
            :title="item.nom"
            :subtitle="`${item.code} · ${categoryLabel(item.categorie)}`"
          >
            <template #append>
              <StatusChip :status="item.disponibilite" />
            </template>
          </v-list-item>
        </v-list>
        <p v-else class="text-medium-emphasis">Aucune fiche pour le moment.</p>
      </section>
      <section class="flex-grow-1" style="min-width: 260px">
        <div class="section-label">Emprunts en cours</div>
        <v-list v-if="activeLoans.length" lines="two" class="pa-0">
          <v-list-item
            v-for="loan in activeLoans"
            :key="loan.id"
            :to="{ name: 'loan-detail', params: { id: loan.id } }"
            :title="loan.titre"
            :subtitle="`${loan.personName} · ${displayDate(loan.dateEmprunt)}`"
          >
            <template #append>
              <v-chip v-if="isOverdue(loan)" size="x-small" color="error" variant="tonal">Retard</v-chip>
            </template>
          </v-list-item>
        </v-list>
        <p v-else class="text-medium-emphasis">Aucun emprunt en cours.</p>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useInventoryStore } from '@/stores/inventory'
import { useAuthStore } from '@/stores/auth'
import { CATEGORIES, categoryLabel } from '@/domain/taxonomy'
import { displayDate } from '@/domain/dates'
import { isOverdue } from '@/domain/loans'
import StatusChip from '@/components/StatusChip.vue'

const inventory = useInventoryStore()
const auth = useAuthStore()

onMounted(() => inventory.refresh().catch(() => {}))

const cards = computed(() => {
  const stats = inventory.stats || { byCategory: {}, totalItems: 0, activeLoans: 0 }
  return [
    { label: 'Fiches', value: stats.totalItems, to: '/inventaire' },
    ...CATEGORIES.map((cat) => {
      const value = stats.byCategory?.[cat.id] || 0
      return {
        label: value === 1 ? cat.label : cat.plural,
        value,
        to: { path: '/inventaire', query: { categorie: cat.id } },
      }
    }),
  ]
})

const recent = computed(() =>
  [...inventory.items].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')).slice(0, 6),
)

const activeLoans = computed(() => inventory.loans.filter((loan) => loan.statut !== 'retourne').slice(0, 6))
</script>

<style scoped>
.stats {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem 2.5rem;
  margin-bottom: 3rem;
}
.stat {
  text-decoration: none;
  color: inherit;
  min-width: 6rem;
}
.stat:hover .text-h5 {
  color: #53736a;
}
</style>

<template>
  <div>
    <div class="d-flex flex-wrap align-center ga-3 mb-6">
      <h1 class="text-h4 page-title">Tableau de bord</h1>
      <v-spacer />
      <v-btn v-if="auth.can('items.create')" color="primary" to="/pieces/nouvelle" prepend-icon="mdi-plus">
        Nouvelle fiche
      </v-btn>
    </div>

    <v-row>
      <v-col v-for="card in cards" :key="card.label" cols="12" sm="6" md="4" lg="2">
        <v-card :to="card.to" variant="outlined" class="pa-4 text-center h-100">
          <v-icon :icon="card.icon" size="28" color="primary" class="mb-2" />
          <div class="text-h5 font-weight-bold">{{ card.value }}</div>
          <div class="text-body-2 text-medium-emphasis">{{ card.label }}</div>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mt-2">
      <v-col cols="12" md="7">
        <v-card variant="outlined">
          <v-card-title>Dernières pièces</v-card-title>
          <v-list>
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
        </v-card>
      </v-col>
      <v-col cols="12" md="5">
        <v-card variant="outlined">
          <v-card-title>Emprunts en cours</v-card-title>
          <v-list v-if="activeLoans.length">
            <v-list-item
              v-for="loan in activeLoans"
              :key="loan.id"
              :to="{ name: 'loan-detail', params: { id: loan.id } }"
              :title="loan.titre"
              :subtitle="`${loan.personName} · ${loan.dateEmprunt}`"
            />
          </v-list>
          <v-card-text v-else class="text-medium-emphasis">Aucun emprunt en cours.</v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useInventoryStore } from '@/stores/inventory'
import { useAuthStore } from '@/stores/auth'
import { CATEGORIES, categoryLabel } from '@/domain/taxonomy'
import StatusChip from '@/components/StatusChip.vue'

const inventory = useInventoryStore()
const auth = useAuthStore()

onMounted(() => inventory.refresh().catch(() => {}))

const cards = computed(() => {
  const stats = inventory.stats || { byCategory: {}, totalItems: 0, activeLoans: 0 }
  return [
    { label: 'Fiches', value: stats.totalItems, icon: 'mdi-archive-outline', to: '/inventaire' },
    ...CATEGORIES.map((cat) => {
      const value = stats.byCategory?.[cat.id] || 0
      return {
        label: value === 1 ? cat.label : cat.plural,
        value,
        icon: cat.icon,
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

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
      <router-link v-for="card in cards" :key="card.label" :to="card.to" class="stat kamg-card">
        <div class="stat__value">{{ card.value }}</div>
        <div class="stat__label">{{ card.label }}</div>
      </router-link>
    </div>

    <div class="home-columns">
      <section v-if="auth.can('items.read')" id="a-faire">
        <div class="section-label">À faire</div>
        <div v-if="taskRows.length" class="kamg-card pa-2">
          <v-list lines="two" class="pa-0">
            <v-list-item
              v-for="row in taskRows"
              :key="`${row.item.id}-${row.task.id}`"
              :to="{ name: 'item-detail', params: { id: row.item.id } }"
              :title="row.task.text"
              :subtitle="`${row.item.code} — ${row.item.nom}`"
            />
          </v-list>
        </div>
        <p v-else class="text-medium-emphasis">Rien à traiter pour le moment.</p>
      </section>
      <section>
        <div class="section-label">Dernières pièces</div>
        <div v-if="recent.length" class="kamg-card pa-2">
          <v-list lines="two" class="pa-0">
            <v-list-item
              v-for="item in recent"
              :key="item.id"
              :to="{ name: 'item-detail', params: { id: item.id } }"
              :title="item.nom"
              :subtitle="`${item.code} · ${categoryLabel(item.categorie, referentiels)}`"
            >
              <template #append>
                <StatusChip :status="item.disponibilite" />
              </template>
            </v-list-item>
          </v-list>
        </div>
        <p v-else class="text-medium-emphasis">Aucune fiche pour le moment.</p>
      </section>
      <section>
        <div class="section-label">Emprunts en cours</div>
        <div v-if="activeLoans.length" class="kamg-card pa-2">
          <v-list lines="two" class="pa-0">
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
        </div>
        <p v-else class="text-medium-emphasis">Aucun emprunt en cours.</p>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useInventoryStore } from '@/stores/inventory'
import { useAuthStore } from '@/stores/auth'
import { categoryLabel } from '@/domain/taxonomy'
import { categoriesWithMeta } from '@/domain/referentiels'
import { displayDate } from '@/domain/dates'
import { isOverdue } from '@/domain/loans'
import { itemsWithOpenTasks } from '@/domain/itemTasks'
import StatusChip from '@/components/StatusChip.vue'

const inventory = useInventoryStore()
const auth = useAuthStore()
const referentiels = computed(() => inventory.resolvedReferentiels)
const categories = computed(() => categoriesWithMeta(referentiels.value))

onMounted(() => inventory.refresh().catch(() => {}))

const cards = computed(() => {
  const stats = inventory.stats || { byCategory: {}, totalItems: 0, activeLoans: 0, lowStock: 0 }
  const list = [
    { label: 'Fiches', value: stats.totalItems, to: '/inventaire' },
    ...categories.value.map((cat) => {
      const value = stats.byCategory?.[cat.id] || 0
      return {
        label: value === 1 ? cat.label : cat.plural,
        value,
        to: { path: '/inventaire', query: { categorie: cat.id } },
      }
    }),
  ]
  if (stats.lowStock) {
    list.push({
      label: 'Stock bas',
      value: stats.lowStock,
      to: { path: '/inventaire', query: { stockBas: '1' } },
    })
  }
  if (stats.pendingMembers) {
    list.unshift({
      label: stats.pendingMembers === 1 ? 'Inscription à ranger' : 'Inscriptions à ranger',
      value: stats.pendingMembers,
      to: '/a-ranger',
    })
  }
  if (stats.openTasks) {
    list.push({
      label: 'Actions à faire',
      value: stats.openTasks,
      to: { path: '/', hash: '#a-faire' },
    })
  }
  return list
})

const taskRows = computed(() =>
  itemsWithOpenTasks(inventory.items)
    .flatMap(({ item, tasks }) => tasks.map((task) => ({ item, task })))
    .slice(0, 8),
)

const recent = computed(() =>
  [...inventory.items].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')).slice(0, 6),
)

const activeLoans = computed(() => inventory.loans.filter((loan) => loan.statut !== 'retourne').slice(0, 6))
</script>

<style scoped>
.stats {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
  margin-bottom: 2rem;
}
.stat {
  text-decoration: none;
  color: inherit;
  padding: 16px 18px;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.stat:hover {
  transform: translateY(-2px);
  box-shadow: var(--kamg-shadow-hover);
}
.stat__value {
  font-size: 1.55rem;
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 1.1;
  color: var(--kamg-ink);
}
.stat__label {
  margin-top: 6px;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--kamg-muted);
}
.home-columns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 20px;
}
</style>

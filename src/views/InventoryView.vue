<template>
  <div class="inventory-page">
    <div class="d-flex flex-wrap align-center ga-3 page-header">
      <h1 class="text-h5 text-md-h4 page-title">Inventaire</h1>
      <v-spacer />
      <v-btn v-if="mdAndUp" variant="tonal" @click="tableView = !tableView">
        {{ tableView ? 'Cartes' : 'Tableau' }}
      </v-btn>
      <v-btn
        v-if="auth.can('items.create')"
        color="primary"
        to="/gestion/pieces/nouvelle"
        :prepend-icon="mdAndUp ? 'mdi-plus' : undefined"
        :icon="!mdAndUp"
        aria-label="Nouvelle fiche"
      >
        <v-icon v-if="!mdAndUp">mdi-plus</v-icon>
        <span v-if="mdAndUp">Nouvelle fiche</span>
      </v-btn>
    </div>

    <!-- Mobile : recherche + chips (style Vinted) -->
    <div v-if="!mdAndUp" class="inventory-mobile-toolbar">
      <v-text-field
        v-model="filters.search"
        prepend-inner-icon="mdi-magnify"
        placeholder="Rechercher…"
        hide-details
        clearable
        density="compact"
        variant="solo-filled"
        flat
        class="inventory-mobile-search"
        bg-color="surface"
      />

      <div class="filter-chips-scroll">
        <v-chip
          class="filter-chip filter-chip--action"
          :color="filterSheetOpen || activeFilterCount ? 'primary' : undefined"
          :variant="filterSheetOpen || activeFilterCount ? 'flat' : 'outlined'"
          @click="filterSheetOpen = true"
        >
          <v-icon start size="18">mdi-tune-variant</v-icon>
          Filtres
          <v-badge
            v-if="activeFilterCount"
            :content="String(activeFilterCount)"
            color="warning"
            inline
            class="ml-1"
          />
        </v-chip>

        <v-chip
          class="filter-chip"
          :color="filters.categorie === 'Tout' ? 'primary' : undefined"
          :variant="filters.categorie === 'Tout' ? 'flat' : 'outlined'"
          @click="filters.categorie = 'Tout'"
        >
          Tout
        </v-chip>

        <v-chip
          v-for="cat in categoryChips"
          :key="cat.value"
          class="filter-chip"
          :color="filters.categorie === cat.value ? 'primary' : undefined"
          :variant="filters.categorie === cat.value ? 'flat' : 'outlined'"
          @click="filters.categorie = cat.value"
        >
          {{ cat.title }}
        </v-chip>

        <v-chip
          class="filter-chip"
          :color="filters.stockBas ? 'warning' : undefined"
          :variant="filters.stockBas ? 'flat' : 'outlined'"
          @click="filters.stockBas = !filters.stockBas"
        >
          Stock bas
        </v-chip>
        <v-chip
          v-for="local in storageLocals"
          :key="local.id"
          class="filter-chip"
          :color="filters.local === local.id ? 'primary' : undefined"
          :variant="filters.local === local.id ? 'flat' : 'outlined'"
          @click="filters.local = filters.local === local.id ? 'Tout' : local.id"
        >
          {{ local.label }}
        </v-chip>
      </div>

      <div class="inventory-mobile-count">{{ filtered.length }} fiche(s)</div>
    </div>

    <!-- Desktop : filtres classiques -->
    <div v-else class="mb-6">
      <InventoryFilterPanel
        v-model:show-measures="showMeasures"
        :filters="filters"
        :category-items="categoryItems"
        :referentiels="referentiels"
        :result-count="filtered.length"
        @reset="resetFilters"
      />
    </div>

    <v-bottom-sheet v-if="!mdAndUp" v-model="filterSheetOpen" scrollable class="inventory-filter-sheet">
      <v-sheet class="inventory-filter-sheet__panel">
        <div class="inventory-filter-sheet__header">
          <span class="text-h6">Filtres</span>
          <v-btn icon variant="text" aria-label="Fermer" @click="filterSheetOpen = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </div>

        <InventoryFilterPanel
          v-model:show-measures="showMeasures"
          :filters="filters"
          :category-items="categoryItems"
          :referentiels="referentiels"
          :result-count="filtered.length"
          :show-search="false"
          @reset="resetFilters"
        />

        <v-btn block color="primary" size="large" class="mt-4" @click="filterSheetOpen = false">
          Voir {{ filtered.length }} fiche(s)
        </v-btn>
      </v-sheet>
    </v-bottom-sheet>

    <v-data-table
      v-if="tableView && mdAndUp"
      :headers="headers"
      :items="filtered"
      item-value="id"
      :items-per-page="25"
      items-per-page-text="Lignes par page"
      no-data-text="Aucune fiche"
      @click:row="(_e, { item }) => $router.push({ name: 'item-detail', params: { id: item.id } })"
    >
      <template #item.photo="{ item }">
        <v-avatar v-if="coverSrc(item, itemById)" rounded size="40">
          <v-img :src="coverSrc(item, itemById)" cover />
        </v-avatar>
        <v-icon v-else size="20" color="primary">mdi-image-off-outline</v-icon>
      </template>
      <template #item.categorie="{ item }">{{ categoryLabel(item.categorie, referentiels) }}</template>
      <template #item.local="{ item }">{{ storageLocalLabel(item.local) || '—' }}</template>
      <template #item.disponibilite="{ item }">
        <StatusChip :status="item.disponibilite" />
      </template>
      <template #item.stock="{ item }">
        {{ hasStock(item) ? formatStock(item) : '—' }}
      </template>
      <template #item.cart="{ item }">
        <v-btn
          v-if="canAddToCart(item)"
          size="small"
          variant="tonal"
          color="primary"
          :disabled="cart.isInCart(item.id)"
          @click.stop="addToCart(item)"
        >
          {{ cart.isInCart(item.id) ? 'Au panier' : 'Emprunter' }}
        </v-btn>
      </template>
    </v-data-table>

    <v-row v-else class="inventory-grid" :class="{ 'inventory-grid--mobile': !mdAndUp }">
      <v-col v-for="item in filtered" :key="item.id" cols="6" sm="6" md="4" lg="3">
        <ItemCard :item="item" :compact="!mdAndUp" />
      </v-col>
      <v-col v-if="!filtered.length" cols="12">
        <v-alert type="info" variant="tonal">
          {{ inventory.items.length ? 'Aucune fiche ne correspond aux filtres.' : 'Aucune fiche pour le moment.' }}
        </v-alert>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDisplay } from 'vuetify'
import { useInventoryStore } from '@/stores/inventory'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'
import { useUiStore } from '@/stores/ui'
import { MEASUREMENT_FIELDS, STORAGE_LOCALS, categoryLabel, storageLocalLabel } from '@/domain/taxonomy'
import { categoriesWithMeta } from '@/domain/referentiels'
import { coverSrc } from '@/domain/images'
import { formatStock, hasStock } from '@/domain/stock'
import { filterItems } from '@/domain/filters'
import { isLoanable } from '@/domain/item'
import ItemCard from '@/components/ItemCard.vue'
import InventoryFilterPanel from '@/components/InventoryFilterPanel.vue'
import StatusChip from '@/components/StatusChip.vue'

const inventory = useInventoryStore()
const auth = useAuthStore()
const cart = useCartStore()
const ui = useUiStore()
const referentiels = computed(() => inventory.resolvedReferentiels)
const route = useRoute()
const router = useRouter()
const display = useDisplay()
const mdAndUp = computed(() => display.mdAndUp.value)
const tableView = ref(display.mdAndUp.value)
const showMeasures = ref(false)
const filterSheetOpen = ref(false)

const defaultMeasureRanges = Object.fromEntries(
  MEASUREMENT_FIELDS.map((field) => [field.key, [0, field.max]]),
)

function defaultFilters() {
  return {
    search: '',
    categorie: route.query.categorie || 'Tout',
    disponibilite: 'Tout',
    epoque: 'Tout',
    etat: 'Tout',
    couleur: 'Tout',
    taille: 'Tout',
    type: 'Tout',
    local: 'Tout',
    stockBas: false,
    ...defaultMeasureRanges,
  }
}

const filters = reactive(defaultFilters())

watch(
  () => route.query.categorie,
  (value) => {
    filters.categorie = value || 'Tout'
  },
)

watch(
  () => route.query.stockBas,
  (value) => {
    filters.stockBas = value === '1' || value === 'true'
  },
  { immediate: true },
)

watch(mdAndUp, (wide) => {
  if (!wide) {
    tableView.value = false
    filterSheetOpen.value = false
  }
})

const categoryItems = computed(() => [
  { title: 'Tout', value: 'Tout' },
  ...categoriesWithMeta(referentiels.value).map((cat) => ({ title: cat.label, value: cat.id })),
])

const categoryChips = computed(() => categoryItems.value.filter((item) => item.value !== 'Tout'))
const storageLocals = STORAGE_LOCALS

const itemById = (id) => inventory.itemById(id)
const filtered = computed(() => filterItems(inventory.items, filters))

const activeFilterCount = computed(() => {
  let count = 0
  if (filters.disponibilite !== 'Tout') count++
  if (filters.epoque !== 'Tout') count++
  if (filters.etat !== 'Tout') count++
  if (filters.stockBas) count++
  if (filters.categorie !== 'Tout') count++
  if (filters.local !== 'Tout') count++
  for (const field of MEASUREMENT_FIELDS) {
    const range = filters[field.key]
    const max = field.max
    if (range[0] > 0 || range[1] < max) count++
  }
  return count
})

const headers = computed(() => {
  const base = [
    { title: '', key: 'photo', sortable: false, width: 56 },
    { title: 'Code', key: 'code' },
    { title: 'Nom', key: 'nom' },
    { title: 'Catégorie', key: 'categorie' },
    { title: 'Type', key: 'type' },
    { title: 'Local', key: 'local' },
    { title: 'Époque', key: 'epoque' },
    { title: 'État', key: 'etat' },
    { title: 'Stock', key: 'stock', sortable: false },
    { title: 'Disponibilité', key: 'disponibilite' },
  ]
  if (auth.can('loans.write')) {
    base.push({ title: 'Panier', key: 'cart', sortable: false, width: 120 })
  }
  return base
})

function canAddToCart(item) {
  return auth.can('loans.write') && (isLoanable(item) || cart.isInCart(item.id))
}

function addToCart(item) {
  if (cart.isInCart(item.id)) return
  cart.add(item)
  ui.notify(`${item.code} ajoutée au panier`, { to: '/gestion/panier', action: 'Panier' })
}

function resetFilters() {
  Object.assign(filters, defaultFilters(), { categorie: 'Tout' })
  router.replace({ path: '/gestion/inventaire' })
}

onMounted(() => inventory.refresh().catch(() => {}))
</script>

<style scoped>
.inventory-mobile-toolbar {
  position: sticky;
  top: 0;
  z-index: 3;
  margin: 0 -0.35rem 1rem;
  padding: 0 0.35rem 0.65rem;
  background: linear-gradient(180deg, var(--kamg-mist) 78%, rgba(244, 246, 244, 0));
}

.inventory-mobile-search :deep(.v-field) {
  border-radius: 14px;
  box-shadow: 0 1px 4px rgba(44, 51, 44, 0.08);
}

.filter-chips-scroll {
  display: flex;
  flex-wrap: nowrap;
  gap: 0.5rem;
  overflow-x: auto;
  padding: 0.65rem 0 0.15rem;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.filter-chips-scroll::-webkit-scrollbar {
  display: none;
}

.filter-chip {
  flex: 0 0 auto;
}

.filter-chip--action {
  font-weight: 600;
}

.inventory-mobile-count {
  font-size: 0.82rem;
  color: rgba(44, 51, 44, 0.62);
  padding-top: 0.35rem;
}

.inventory-filter-sheet__panel {
  padding: 1rem 1.15rem 1.5rem;
  border-radius: 20px 20px 0 0;
  max-height: 88vh;
  overflow-y: auto;
}

.inventory-filter-sheet__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.inventory-grid--mobile {
  margin-inline: -0.35rem;
}

.inventory-grid--mobile :deep(.v-col) {
  padding: 6px;
}
</style>

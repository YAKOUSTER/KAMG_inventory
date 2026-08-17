<template>
  <v-card class="item-card h-100 hover-card" :class="{ 'item-card--compact': compact }" variant="flat">
    <router-link class="card-link" :to="{ name: 'item-detail', params: { id: item.id } }">
      <div class="thumb-wrap">
        <div class="thumb" :style="{ backgroundImage: cover ? `url(${cover})` : 'none' }">
          <v-icon v-if="!cover" size="40" color="primary">{{ catIcon }}</v-icon>
        </div>
        <StatusChip v-if="compact" class="thumb-status" :status="item.disponibilite" size="x-small" />
        <v-btn
          v-if="showLoan && compact"
          class="thumb-cart"
          size="x-small"
          icon
          variant="flat"
          color="surface"
          :disabled="inCart || !loanable"
          aria-label="Emprunter"
          @click.prevent.stop="add"
        >
          <v-icon size="18">{{ inCart ? 'mdi-cart-check' : 'mdi-cart-plus' }}</v-icon>
        </v-btn>
      </div>

      <v-card-text class="item-card__body">
        <template v-if="compact">
          <div class="item-card__title">{{ item.nom }}</div>
          <div class="item-card__meta">{{ item.code }}</div>
          <div v-if="hasStock(item)" class="item-card__stock">{{ formatStock(item) }}</div>
        </template>
        <template v-else>
          <div class="text-caption text-medium-emphasis">{{ item.code }} · {{ catLabel }}</div>
          <div class="text-subtitle-1 font-weight-bold">{{ item.nom }}</div>
          <div class="text-body-2 mt-1">{{ item.type }}</div>
          <div v-if="hasStock(item)" class="text-body-2 mt-1 font-weight-medium">{{ formatStock(item) }}</div>
          <StatusChip class="mt-2" :status="item.disponibilite" />
        </template>
      </v-card-text>
    </router-link>

    <v-card-actions v-if="showLoan && !compact">
      <v-spacer />
      <v-btn
        size="small"
        variant="tonal"
        color="primary"
        :disabled="inCart || !loanable"
        @click.stop="add"
      >
        <v-icon start size="18">mdi-cart-plus</v-icon>
        {{ inCart ? 'Au panier' : 'Emprunter' }}
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'
import { categoryIcon, categoryLabel } from '@/domain/taxonomy'
import { coverSrc } from '@/domain/images'
import { isLoanable } from '@/domain/item'
import { formatStock, hasStock } from '@/domain/stock'
import { useCartStore } from '@/stores/cart'
import { useAuthStore } from '@/stores/auth'
import { useInventoryStore } from '@/stores/inventory'
import { useUiStore } from '@/stores/ui'
import StatusChip from './StatusChip.vue'

const props = defineProps({
  item: { type: Object, required: true },
  compact: { type: Boolean, default: false },
})

const cart = useCartStore()
const auth = useAuthStore()
const inventory = useInventoryStore()
const ui = useUiStore()
const referentiels = computed(() => inventory.resolvedReferentiels)
const catLabel = computed(() => categoryLabel(props.item.categorie, referentiels.value))
const catIcon = computed(() => categoryIcon(props.item.categorie, referentiels.value))
const cover = computed(() => coverSrc(props.item, (id) => inventory.itemById(id)))
const loanable = computed(() => isLoanable(props.item))
const inCart = computed(() => cart.isInCart(props.item.id))
const showLoan = computed(() => auth.can('loans.write') && (loanable.value || inCart.value))

function add() {
  cart.add(props.item)
  ui.notify(`${props.item.code} ajoutée au panier`, { to: '/panier', action: 'Panier' })
}
</script>

<style scoped>
.hover-card {
  background: transparent !important;
}

.hover-card:hover .item-card__title,
.hover-card:hover .text-subtitle-1 {
  color: #53736a;
}

.card-link {
  color: inherit;
  text-decoration: none;
  display: block;
}

.thumb-wrap {
  position: relative;
}

.thumb {
  height: 140px;
  background: #edede5 center/cover no-repeat;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 20px;
}

.thumb-status {
  position: absolute;
  top: 8px;
  left: 8px;
}

.thumb-cart {
  position: absolute;
  right: 8px;
  bottom: 8px;
  box-shadow: 0 2px 8px rgba(44, 51, 44, 0.18);
}

.item-card__body {
  padding-top: 0.65rem !important;
}

.item-card__title {
  font-size: 0.88rem;
  font-weight: 600;
  line-height: 1.25;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.item-card__meta {
  margin-top: 0.15rem;
  font-size: 0.72rem;
  color: rgba(44, 51, 44, 0.62);
}

.item-card__stock {
  margin-top: 0.2rem;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--kamg-deep);
}

.item-card--compact .thumb {
  height: auto;
  aspect-ratio: 4 / 5;
  border-radius: 10px;
}

.item-card--compact .item-card__body {
  padding-top: 0.45rem !important;
  padding-bottom: 0.35rem !important;
  padding-inline: 0.1rem !important;
}

.item-card--compact .item-card__title {
  font-size: 0.82rem;
}
</style>

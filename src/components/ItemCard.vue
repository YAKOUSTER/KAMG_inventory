<template>
  <v-card class="h-100 hover-card" variant="flat">
    <router-link class="card-link" :to="{ name: 'item-detail', params: { id: item.id } }">
      <div class="thumb" :style="{ backgroundImage: cover ? `url(${cover})` : 'none' }">
        <v-icon v-if="!cover" size="40" color="primary">{{ catIcon }}</v-icon>
      </div>
      <v-card-text>
        <div class="text-caption text-medium-emphasis">{{ item.code }} · {{ catLabel }}</div>
        <div class="text-subtitle-1 font-weight-bold">{{ item.nom }}</div>
        <div class="text-body-2 mt-1">{{ item.type }}</div>
        <div v-if="isFourniture(item)" class="text-body-2 mt-1 font-weight-medium">{{ formatStock(item) }}</div>
        <StatusChip class="mt-2" :status="item.disponibilite" />
      </v-card-text>
    </router-link>
    <v-card-actions v-if="showLoan">
      <v-spacer />
      <v-btn
        size="small"
        variant="text"
        color="primary"
        :disabled="inCart || !loanable"
        @click="add"
      >
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
import { formatStock, isFourniture } from '@/domain/stock'
import { useCartStore } from '@/stores/cart'
import { useAuthStore } from '@/stores/auth'
import { useInventoryStore } from '@/stores/inventory'
import { useUiStore } from '@/stores/ui'
import StatusChip from './StatusChip.vue'

const props = defineProps({
  item: { type: Object, required: true },
})

const cart = useCartStore()
const auth = useAuthStore()
const inventory = useInventoryStore()
const ui = useUiStore()
const referentiels = computed(() => inventory.resolvedReferentiels)
const catLabel = computed(() => categoryLabel(props.item.categorie, referentiels.value))
const catIcon = computed(() => categoryIcon(props.item.categorie, referentiels.value))
const cover = computed(() => coverSrc(props.item))
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
.hover-card:hover .text-subtitle-1 {
  color: #53736a;
}
.card-link {
  color: inherit;
  text-decoration: none;
  display: block;
}
.thumb {
  height: 140px;
  background: #edede5 center/cover no-repeat;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 20px;
}
</style>

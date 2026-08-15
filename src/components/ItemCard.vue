<template>
  <v-card class="h-100 hover-card" variant="outlined">
    <router-link class="card-link" :to="{ name: 'item-detail', params: { id: item.id } }">
      <div class="thumb" :style="{ backgroundImage: cover ? `url(${cover})` : 'none' }">
        <v-icon v-if="!cover" size="40" color="primary">{{ categoryIcon(item.categorie) }}</v-icon>
      </div>
      <v-card-text>
        <div class="text-caption text-medium-emphasis">{{ item.code }} · {{ categoryLabel(item.categorie) }}</div>
        <div class="text-subtitle-1 font-weight-bold">{{ item.nom }}</div>
        <div class="text-body-2 mt-1">{{ item.type }}</div>
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
import { useCartStore } from '@/stores/cart'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import StatusChip from './StatusChip.vue'

const props = defineProps({
  item: { type: Object, required: true },
})

const cart = useCartStore()
const auth = useAuthStore()
const ui = useUiStore()
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
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.hover-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(83, 115, 106, 0.12);
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
}
</style>

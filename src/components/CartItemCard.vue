<template>
  <v-card class="cart-item-card h-100" variant="flat" :class="{ 'cart-item-card--warn': unavailable }">
    <router-link class="cart-item-card__media" :to="{ name: 'item-detail', params: { id: line.id } }">
      <div class="thumb" :style="{ backgroundImage: cover ? `url(${cover})` : 'none' }">
        <v-icon v-if="!cover" size="40" color="primary">{{ catIcon }}</v-icon>
      </div>
    </router-link>

    <v-card-text class="cart-item-card__body">
      <div class="d-flex align-start ga-2">
        <div class="flex-grow-1 min-width-0">
          <router-link class="cart-item-card__title" :to="{ name: 'item-detail', params: { id: line.id } }">
            {{ line.code }}
          </router-link>
          <div class="text-subtitle-1 font-weight-bold text-truncate">{{ line.nom }}</div>
          <div class="text-body-2 text-medium-emphasis mt-1">
            {{ line.type || '—' }}
            <span v-if="line.tailleLettre"> · {{ line.tailleLettre }}</span>
          </div>
          <StatusChip v-if="item" class="mt-2" :status="item.disponibilite" />
        </div>
        <v-btn icon variant="text" size="small" aria-label="Retirer du panier" @click="$emit('remove', line.id)">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </div>

      <v-alert v-if="unavailable" type="warning" variant="tonal" density="compact" class="mt-3 mb-0">
        Cette pièce n’est plus disponible à l’emprunt.
      </v-alert>

      <FieldRow label="Commentaire" hint="état, note de sortie…" class="mt-3 mb-0">
        <v-text-field
          :model-value="line.comment"
          hide-details
          placeholder="Bon état, bouton à surveiller…"
          @update:model-value="$emit('comment', line.id, $event)"
        />
      </FieldRow>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'
import { categoryIcon } from '@/domain/taxonomy'
import { coverSrc } from '@/domain/images'
import { useInventoryStore } from '@/stores/inventory'
import StatusChip from './StatusChip.vue'
import FieldRow from './FieldRow.vue'

const props = defineProps({
  line: { type: Object, required: true },
  item: { type: Object, default: null },
  unavailable: { type: Boolean, default: false },
})

defineEmits(['remove', 'comment'])

const inventory = useInventoryStore()
const referentiels = computed(() => inventory.resolvedReferentiels)
const catIcon = computed(() =>
  categoryIcon(props.item?.categorie || 'piece_costume', referentiels.value),
)
const cover = computed(() =>
  props.item ? coverSrc(props.item, (id) => inventory.itemById(id)) : '',
)
</script>

<style scoped>
.cart-item-card {
  border: 1px solid rgba(83, 115, 106, 0.18);
  border-radius: 20px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.72);
}
.cart-item-card--warn {
  border-color: rgba(184, 92, 56, 0.35);
}
.cart-item-card__media {
  display: block;
  text-decoration: none;
}
.thumb {
  height: 160px;
  background: #edede5 center/cover no-repeat;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cart-item-card__body {
  padding-top: 1rem;
}
.cart-item-card__title {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #53736a;
  text-decoration: none;
}
.cart-item-card__title:hover {
  text-decoration: underline;
}
</style>

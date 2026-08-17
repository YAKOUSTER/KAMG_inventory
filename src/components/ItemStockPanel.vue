<template>
  <section class="page-block">
    <div class="d-flex flex-wrap align-center ga-3 mb-4">
      <h2 class="section-label mb-0">Quantité restante</h2>
      <v-spacer />
      <StatusChip :status="item.disponibilite" />
    </div>

    <div class="stock-summary mb-4">
      <div class="text-h4 font-weight-bold">{{ formatStock(item) }}</div>
      <div v-if="item.stockSeuil != null" class="text-body-2 text-medium-emphasis">
        Seuil d’alerte : {{ item.stockSeuil }} {{ item.stockUnite }}
      </div>
      <div v-if="item.stockReference" class="text-body-2 text-medium-emphasis">
        Réf. fournisseur : {{ item.stockReference }}
      </div>
    </div>

    <div v-if="canEdit" class="stock-adjust mb-4">
      <div class="text-subtitle-2 mb-2">Mouvement de stock</div>
      <div class="d-flex flex-wrap ga-2 align-center">
        <v-btn-toggle v-model="mode" mandatory density="compact" color="primary">
          <v-btn value="add" size="small">Entrée</v-btn>
          <v-btn value="remove" size="small">Sortie</v-btn>
          <v-btn value="set" size="small">Inventaire</v-btn>
        </v-btn-toggle>
        <v-text-field
          v-model.number="quantity"
          type="number"
          min="0"
          step="any"
          :label="mode === 'set' ? 'Quantité réelle' : 'Quantité'"
          density="compact"
          hide-details
          style="max-width: 140px"
        />
        <v-text-field
          v-model="motif"
          label="Motif"
          placeholder="achat, utilisation atelier…"
          density="compact"
          hide-details
          class="flex-grow-1"
          style="min-width: 180px"
        />
        <v-btn color="primary" :loading="saving" :disabled="!canSubmit" @click="apply">
          Enregistrer
        </v-btn>
      </div>
      <v-alert v-if="error" type="error" density="compact" class="mt-3">{{ error }}</v-alert>
    </div>

    <div v-if="movements.length">
      <div class="text-subtitle-2 mb-2">Historique</div>
      <v-table class="stock-table" density="compact">
        <thead>
          <tr>
            <th>Date</th>
            <th>Mouvement</th>
            <th>Après</th>
            <th>Motif</th>
            <th>Par</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="move in movements" :key="move.id">
            <td>{{ displayDate(move.at) }}</td>
            <td :class="move.delta > 0 ? 'text-success' : 'text-error'">
              {{ move.delta > 0 ? '+' : '' }}{{ move.delta }}
            </td>
            <td>{{ move.quantiteApres }}</td>
            <td>{{ move.motif || '—' }}</td>
            <td>{{ move.auteur || '—' }}</td>
          </tr>
        </tbody>
      </v-table>
    </div>
    <p v-else class="text-medium-emphasis">Aucun mouvement enregistré.</p>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { api } from '@/services/api'
import { displayDate } from '@/domain/dates'
import { formatStock } from '@/domain/stock'
import StatusChip from './StatusChip.vue'

const props = defineProps({
  item: { type: Object, required: true },
  canEdit: { type: Boolean, default: false },
})

const emit = defineEmits(['updated'])

const mode = ref('add')
const quantity = ref(null)
const motif = ref('')
const saving = ref(false)
const error = ref('')

const movements = computed(() => props.item.stockMouvements || [])

const canSubmit = computed(() => {
  if (quantity.value == null || quantity.value === '') return false
  if (mode.value === 'set') return Number(quantity.value) >= 0
  return Number(quantity.value) > 0
})

watch(mode, () => {
  quantity.value = null
  error.value = ''
})

async function apply() {
  saving.value = true
  error.value = ''
  try {
    const body =
      mode.value === 'set'
        ? { quantite: Number(quantity.value), motif: motif.value }
        : { delta: mode.value === 'add' ? Number(quantity.value) : -Number(quantity.value), motif: motif.value }
    const saved = await api.adjustStock(props.item.id, body)
    emit('updated', saved)
    quantity.value = null
    motif.value = ''
  } catch (err) {
    error.value = err.message || 'Mouvement impossible.'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.stock-summary {
  padding: 16px 20px;
  border-radius: 12px;
  background: #edede5;
}
.stock-table td,
.stock-table th {
  white-space: nowrap;
}
</style>

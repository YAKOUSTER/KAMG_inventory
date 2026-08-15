<template>
  <div v-if="item">
    <div class="d-flex flex-wrap align-center ga-3 mb-4">
      <v-btn variant="text" to="/inventaire" prepend-icon="mdi-arrow-left">Inventaire</v-btn>
      <v-spacer />
      <v-btn
        v-if="canLoan"
        color="primary"
        :disabled="cart.isInCart(item.id)"
        @click="cart.add(item)"
      >
        {{ cart.isInCart(item.id) ? 'Déjà au panier' : 'Ajouter au panier' }}
      </v-btn>
      <v-btn variant="tonal" :to="{ name: 'item-edit', params: { id: item.id } }" prepend-icon="mdi-pencil">Modifier</v-btn>
      <v-btn variant="text" color="error" @click="remove">Supprimer</v-btn>
    </div>

    <v-row>
      <v-col cols="12" md="5">
        <v-img
          v-if="item.images?.[0]"
          :src="item.images[0]"
          class="rounded-lg"
          max-height="420"
          cover
        />
        <v-sheet v-else class="d-flex align-center justify-center rounded-lg" height="280" color="kamg">
          <v-icon size="72" color="primary">{{ categoryIcon(item.categorie) }}</v-icon>
        </v-sheet>
      </v-col>
      <v-col cols="12" md="7">
        <div class="text-overline">{{ item.code }} · {{ categoryLabel(item.categorie) }}</div>
        <h1 class="text-h4 page-title mb-2">{{ item.nom }}</h1>
        <div class="text-subtitle-1 mb-3">{{ item.type }}</div>
        <StatusChip :status="item.disponibilite" />
        <v-list class="mt-4" density="compact">
          <v-list-item v-for="row in facts" :key="row.label" :title="row.value || '—'" :subtitle="row.label" />
        </v-list>
      </v-col>
    </v-row>

    <v-card class="mt-6" variant="outlined">
      <v-card-title>Description</v-card-title>
      <v-card-text>
        <p>{{ item.description || 'Pas de description.' }}</p>
        <p v-if="item.motif"><strong>Motif :</strong> {{ item.motif }}</p>
        <p v-if="item.notesConservation"><strong>Conservation :</strong> {{ item.notesConservation }}</p>
      </v-card-text>
    </v-card>

    <v-card v-if="measureRows.length" class="mt-4" variant="outlined">
      <v-card-title>Mesures</v-card-title>
      <v-table>
        <tbody>
          <tr v-for="row in measureRows" :key="row.label">
            <td>{{ row.label }}</td>
            <td>{{ row.value ?? 'À compléter' }}</td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <v-card v-if="item.linkedItems?.length" class="mt-4" variant="outlined">
      <v-card-title>Pièces liées</v-card-title>
      <v-card-text>
        <v-row>
          <v-col v-for="linked in item.linkedItems" :key="linked.id" cols="12" sm="6" md="4">
            <ItemCard :item="linked" />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-card class="mt-4" variant="outlined">
      <v-card-title>Historique des emprunts</v-card-title>
      <v-list v-if="item.loanHistory?.length">
        <v-list-item
          v-for="entry in item.loanHistory"
          :key="entry.loanId"
          :title="`${entry.personName} — ${entry.dateEmprunt}`"
          :subtitle="`Retour : ${entry.dateRetour || 'en cours'}${entry.comment ? ' · ' + entry.comment : ''}`"
        />
      </v-list>
      <v-card-text v-else>Aucun emprunt enregistré pour cette fiche.</v-card-text>
    </v-card>
  </div>
  <v-alert v-else-if="error" type="error">{{ error }}</v-alert>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/services/api'
import { useCartStore } from '@/stores/cart'
import { useInventoryStore } from '@/stores/inventory'
import { MEASUREMENT_FIELDS, categoryIcon, categoryLabel, visibleMeasurements } from '@/domain/taxonomy'
import { isLoanable } from '@/domain/item'
import ItemCard from '@/components/ItemCard.vue'
import StatusChip from '@/components/StatusChip.vue'

const props = defineProps({ id: { type: String, required: true } })
const router = useRouter()
const cart = useCartStore()
const inventory = useInventoryStore()
const item = ref(null)
const error = ref('')

const canLoan = computed(() => isLoanable(item.value))

const facts = computed(() => {
  if (!item.value) return []
  const rows = [
    { label: 'Époque', value: item.value.epoque },
    { label: 'Origine', value: item.value.origine },
    { label: 'Matière', value: item.value.materiau },
    { label: 'Composition', value: item.value.composition },
    { label: 'Couleur', value: item.value.couleur },
    { label: 'État', value: item.value.etat },
    { label: 'Propriétaire', value: item.value.proprietaire },
    { label: 'Localisation', value: item.value.localisation },
  ]
  if (item.value.categorie === 'tissu') {
    rows.push(
      { label: 'Laize', value: item.value.laize ? `${item.value.laize} cm` : '' },
      { label: 'Métrage', value: item.value.metrage ? `${item.value.metrage} m` : '' },
      { label: 'Fournisseur', value: item.value.fournisseur },
    )
  }
  if (item.value.categorie === 'echantillon') {
    rows.push(
      { label: 'Format', value: [item.value.largeurEchantillon, item.value.hauteurEchantillon].filter(Boolean).join(' × ') + (item.value.largeurEchantillon ? ' cm' : '') },
      { label: 'Armure', value: item.value.armure },
    )
  }
  if (item.value.categorie === 'piece_collection') {
    rows.push(
      { label: 'N° inventaire', value: item.value.numeroInventaire },
      { label: 'Provenance', value: item.value.provenance },
      { label: 'Acquisition', value: [item.value.modeAcquisition, item.value.dateAcquisition].filter(Boolean).join(' · ') },
    )
  }
  return rows.filter((row) => row.value)
})

const measureRows = computed(() => {
  if (!item.value) return []
  const vis = visibleMeasurements(item.value.type)
  const rows = MEASUREMENT_FIELDS.filter((field) => vis[field.key]).map((field) => ({
    label: field.label,
    value: item.value[field.key],
  }))
  if (item.value.variable) {
    rows.push({ label: item.value.variable, value: item.value.longueurVariable })
  }
  return rows
})

async function load() {
  error.value = ''
  try {
    item.value = await api.item(props.id)
  } catch (err) {
    error.value = err.message
  }
}

async function remove() {
  if (!confirm('Supprimer cette fiche ?')) return
  await api.deleteItem(props.id)
  await inventory.refresh()
  router.push('/inventaire')
}

watch(() => props.id, load, { immediate: true })
</script>

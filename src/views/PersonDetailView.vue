<template>
  <div v-if="person">
    <div class="d-flex flex-wrap align-center ga-3 page-header">
      <v-btn variant="text" to="/personnes" prepend-icon="mdi-arrow-left">Personnes</v-btn>
      <v-spacer />
      <v-btn
        v-if="auth.can('loans.write')"
        color="primary"
        :to="{ path: '/panier', query: { person: person.id } }"
      >
        Nouvel emprunt
      </v-btn>
      <v-btn
        v-if="auth.can('people.write')"
        variant="tonal"
        :to="{ name: 'person-edit', params: { id: person.id } }"
        prepend-icon="mdi-pencil"
      >
        Modifier
      </v-btn>
      <v-btn v-if="auth.can('people.write')" variant="text" color="error" @click="remove">Supprimer</v-btn>
    </div>

    <v-row>
      <v-col cols="12" md="4">
        <ImageGallery :item="person" placeholder-icon="mdi-account" />
      </v-col>
      <v-col cols="12" md="8">
        <h1 class="text-h4 page-title">{{ personDisplayName(person) }}</h1>
        <div v-if="roleChips.length || orgChips.length" class="d-flex flex-wrap ga-2 mb-4">
          <v-chip v-for="label in roleChips" :key="label" size="small" variant="tonal">{{ label }}</v-chip>
          <v-chip v-for="label in orgChips" :key="`org-${label}`" size="small" color="primary" variant="tonal">
            {{ label }}
          </v-chip>
        </div>
        <div class="detail-rows">
          <DetailRow v-if="seasonLabel" label="Saisons" :value="seasonLabel" />
          <DetailRow v-if="person.telephone" label="Téléphone" :value="person.telephone" />
          <DetailRow v-if="person.email" label="Courriel" :value="person.email" />
          <DetailRow v-if="person.tailleLettre" label="Taille générale" :value="person.tailleLettre" />
        </div>
      </v-col>
    </v-row>

    <section v-if="person.bio" class="page-block">
      <h2 class="section-label">Biographie</h2>
      <p class="text-multiline text-body-1">{{ person.bio }}</p>
    </section>

    <section v-if="person.noteAtelier" class="page-block">
      <h2 class="section-label">Mémo au Groupe Vêtement</h2>
      <v-alert type="info" variant="tonal" class="text-multiline">{{ person.noteAtelier }}</v-alert>
    </section>

    <section v-if="person.notes" class="page-block">
      <h2 class="section-label">Notes</h2>
      <p class="text-multiline text-body-1">{{ person.notes }}</p>
    </section>

    <section class="page-block">
      <h2 class="section-label">Mensurations</h2>
      <v-table v-if="filledMeasures.length" class="measure-table" density="compact">
        <tbody>
          <tr v-for="field in filledMeasures" :key="field.key">
            <td>{{ field.label }}</td>
            <td>{{ person.mesures[field.key] }}</td>
          </tr>
        </tbody>
      </v-table>
      <p v-else class="text-medium-emphasis">Aucune mensuration renseignée.</p>
    </section>

    <section class="page-block">
      <h2 class="section-label">Actuellement en sa possession</h2>
      <v-row v-if="heldEntries.length">
        <v-col v-for="entry in heldEntries" :key="`${entry.loanId}-${entry.itemId}`" cols="12" sm="6" md="4">
          <ItemCard v-if="entry.item" :item="entry.item" />
          <v-card v-else variant="flat" class="pa-4">
            <div class="text-subtitle-1 font-weight-bold">{{ entry.code || '—' }}</div>
            <div class="text-body-2">{{ entry.nom || 'Pièce introuvable' }}</div>
          </v-card>
          <div class="text-caption text-medium-emphasis mt-2 px-1">
            <router-link :to="{ name: 'loan-detail', params: { id: entry.loanId } }">
              {{ entry.loanTitre }}
            </router-link>
            · emprunté le {{ displayDate(entry.dateEmprunt) }}
            <span v-if="entry.comment"> · {{ entry.comment }}</span>
          </div>
        </v-col>
      </v-row>
      <p v-else class="text-medium-emphasis">Aucune pièce en sa possession pour le moment.</p>
    </section>

    <section class="page-block">
      <h2 class="section-label">Historique des emprunts</h2>
      <p v-if="!person.loansByYear?.length" class="text-medium-emphasis">Aucun emprunt enregistré.</p>
      <div v-for="group in person.loansByYear" :key="group.year" class="mb-4">
        <div class="text-subtitle-1 font-weight-bold pt-2">{{ group.year }}</div>
        <v-list>
          <v-list-item
            v-for="loan in group.loans"
            :key="loan.id"
            :to="{ name: 'loan-detail', params: { id: loan.id } }"
            :title="loan.titre"
            :subtitle="`${displayDate(loan.dateEmprunt)} · ${statusLabel(loan.statut)} · ${(loan.items || []).map((i) => i.code).filter(Boolean).join(', ')}`"
          />
        </v-list>
      </div>
    </section>
  </div>
  <v-skeleton-loader v-else-if="loading" type="article, list-item-two-line" />
  <v-alert v-else-if="error" type="error">{{ error }}</v-alert>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { useInventoryStore } from '@/stores/inventory'
import { PERSON_MEASUREMENTS, displayDate, personDisplayName, personRoleLabels, personSeasons, isNewMember } from '@/domain/person'
import { personOrgTagLabels } from '@/domain/orgChart'
import { itemsInPossession } from '@/domain/loans'
import { useUiStore } from '@/stores/ui'
import ImageGallery from '@/components/ImageGallery.vue'
import DetailRow from '@/components/DetailRow.vue'
import ItemCard from '@/components/ItemCard.vue'

const props = defineProps({ id: { type: String, required: true } })
const router = useRouter()
const auth = useAuthStore()
const inventory = useInventoryStore()
const person = ref(null)
const error = ref('')
const loading = ref(false)
const ui = useUiStore()

const filledMeasures = computed(() =>
  PERSON_MEASUREMENTS.filter((field) => {
    const value = person.value?.mesures?.[field.key]
    return value != null && value !== ''
  }),
)

const roleChips = computed(() => personRoleLabels(person.value))
const orgChips = computed(() => personOrgTagLabels(person.value))
const seasonLabel = computed(() => {
  const seasons = personSeasons(person.value)
  if (!seasons.length) return isNewMember(person.value) ? 'NEW' : ''
  return isNewMember(person.value) ? `${seasons.join(', ')} · NEW` : seasons.join(', ')
})

const heldEntries = computed(() =>
  itemsInPossession(person.value?.loans || []).map((entry) => ({
    ...entry,
    item: inventory.itemById(entry.itemId),
  })),
)

function statusLabel(status) {
  return { en_cours: 'En cours', retour_partiel: 'Retour partiel', retourne: 'Retourné' }[status] || status
}

async function load() {
  error.value = ''
  loading.value = true
  try {
    person.value = await api.person(props.id)
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

async function remove() {
  if (!confirm(`Supprimer ${personDisplayName(person.value)} ?`)) return
  try {
    await api.deletePerson(props.id)
    inventory.removePerson(props.id)
    ui.notify('Personne supprimée')
    router.push('/personnes')
  } catch (err) {
    error.value = err.message
  }
}

watch(() => props.id, load, { immediate: true })
</script>

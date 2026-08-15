<template>
  <div v-if="person">
    <div class="d-flex flex-wrap align-center ga-3 mb-4">
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
        <h1 class="text-h4 page-title">{{ person.nom }}</h1>
        <div class="text-subtitle-1 mb-4">{{ person.role }}</div>
        <v-list density="compact">
          <v-list-item v-if="person.telephone" :title="person.telephone" subtitle="Téléphone" />
          <v-list-item v-if="person.email" :title="person.email" subtitle="Email" />
          <v-list-item v-if="person.tailleLettre" :title="person.tailleLettre" subtitle="Taille générale" />
        </v-list>
        <p v-if="person.notes" class="mt-2">{{ person.notes }}</p>
      </v-col>
    </v-row>

    <v-card class="mt-6" variant="outlined">
      <v-card-title>Mensurations</v-card-title>
      <v-table v-if="filledMeasures.length">
        <tbody>
          <tr v-for="field in filledMeasures" :key="field.key">
            <td>{{ field.label }}</td>
            <td>{{ person.mesures[field.key] }}</td>
          </tr>
        </tbody>
      </v-table>
      <v-card-text v-else class="text-medium-emphasis">Aucune mensuration renseignée.</v-card-text>
    </v-card>

    <v-card class="mt-4" variant="outlined">
      <v-card-title>Historique des emprunts</v-card-title>
      <v-card-text v-if="!person.loansByYear?.length">Aucun emprunt enregistré.</v-card-text>
      <div v-for="group in person.loansByYear" :key="group.year" class="mb-4">
        <div class="text-subtitle-1 font-weight-bold px-4 pt-2">{{ group.year }}</div>
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
    </v-card>
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
import { PERSON_MEASUREMENTS, displayDate } from '@/domain/person'
import { useUiStore } from '@/stores/ui'
import ImageGallery from '@/components/ImageGallery.vue'

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
  if (!confirm(`Supprimer ${person.value.nom} ?`)) return
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

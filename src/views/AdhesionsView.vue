<template>
  <div>
    <div class="d-flex flex-wrap align-center ga-3 page-header">
      <h1 class="text-h5 text-md-h4 page-title">Adhésions</h1>
      <v-spacer />
      <v-btn variant="text" class="text-none" to="/personnes">Personnes</v-btn>
    </div>

    <p class="text-body-2 text-medium-emphasis mb-4" style="max-width: 72ch">
      L’adhésion court d’octobre à octobre. Les membres de l’année en cours sont ceux qui ont payé
      pour {{ currentSeason }} (jusqu’en octobre {{ currentEndYear }}).
      <template v-if="nextSeason !== currentSeason">
        Cochez ensuite les paiements pour {{ nextSeason }}.
      </template>
    </p>

    <v-row class="mb-4">
      <v-col cols="12" md="4">
        <v-select v-model="seasonId" :items="seasonItems" label="Année d’adhésion" hide-details />
      </v-col>
      <v-col cols="12" md="4">
        <v-text-field
          v-model="search"
          prepend-inner-icon="mdi-magnify"
          label="Rechercher"
          hide-details
          clearable
        />
      </v-col>
      <v-col cols="12" sm="6" md="2">
        <v-select v-model="role" :items="roleItems" label="Groupe" hide-details />
      </v-col>
      <v-col cols="12" sm="6" md="2">
        <v-select v-model="paidFilter" :items="paidItems" label="Paiement" hide-details />
      </v-col>
    </v-row>

    <div class="d-flex align-center ga-2 mb-4">
      <span class="text-body-2 text-medium-emphasis">
        {{ paidCount }} / {{ filteredPeople.length }} adhésion(s) {{ seasonId }}
      </span>
      <v-spacer />
      <v-btn v-if="hasActiveFilters" variant="text" size="small" color="error" @click="resetFilters">
        Réinitialiser
      </v-btn>
    </div>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4" closable @click:close="error = ''">
      {{ error }}
    </v-alert>

    <p v-if="!auth.can('people.write')" class="text-caption text-medium-emphasis mb-3">
      Consultation uniquement. Le CA coche les paiements avec un accès d’écriture sur les personnes.
    </p>

    <div v-if="filteredPeople.length" class="kamg-card pa-2 pa-sm-4">
      <div
        v-for="person in filteredPeople"
        :key="person.id"
        class="adhesion-row"
      >
        <div class="adhesion-row__identity min-width-0">
          <router-link
            class="adhesion-row__name"
            :to="{ name: 'person-detail', params: { id: person.id } }"
          >
            {{ personDisplayName(person) }}
          </router-link>
          <div class="d-flex flex-wrap align-center ga-1 mt-1">
            <v-chip
              size="x-small"
              :color="isActiveMember(person) ? 'success' : 'warning'"
              variant="tonal"
            >
              {{ membershipStatusLabel(person) }}
            </v-chip>
            <span v-if="membershipLabels(person).length" class="text-caption text-medium-emphasis">
              {{ membershipLabels(person).join(' · ') }}
            </span>
          </div>
        </div>
        <v-select
          :model-value="methodOf(person)"
          :items="methodItems"
          :disabled="!auth.can('people.write') || Boolean(saving[person.id])"
          density="compact"
          hide-details
          label="Paiement"
          class="adhesion-row__method"
          clearable
          @update:model-value="setMethod(person, $event)"
        />
        <v-switch
          :model-value="isPaid(person)"
          :disabled="!auth.can('people.write') || Boolean(saving[person.id])"
          color="primary"
          hide-details
          density="compact"
          :label="isPaid(person) ? 'Payé' : 'Non payé'"
          class="adhesion-row__switch"
          @update:model-value="setPaid(person, $event)"
        />
      </div>
    </div>
    <v-alert v-else type="info" variant="tonal">
      {{ inventory.people.length ? 'Aucune personne ne correspond.' : 'Aucune personne enregistrée.' }}
    </v-alert>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useInventoryStore } from '@/stores/inventory'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/services/api'
import {
  PAYMENT_METHODS,
  PERSON_ROLES,
  adhesionPeople,
  hasPaidSeason,
  isActiveMember,
  matchesSearch,
  membershipLabels,
  membershipStatusLabel,
  personAdhesionMethod,
  personDisplayName,
  personSearchText,
  sortPeople,
} from '@/domain/person'
import { adhesionSeasonItems, currentSeasonId, newSeasonId, seasonStartYear } from '@/domain/seasons'

const inventory = useInventoryStore()
const auth = useAuthStore()
const error = ref('')
const saving = reactive({})
const paidOverrides = reactive({})
const methodOverrides = reactive({})
const search = ref('')
const role = ref('Tous')
const paidFilter = ref('tous')
const seasonId = ref(newSeasonId())

const currentSeason = currentSeasonId()
const nextSeason = newSeasonId()
const currentEndYear = (seasonStartYear(currentSeason) || 0) + 1
const seasonItems = adhesionSeasonItems()
const roleItems = [
  { title: 'Tous les groupes', value: 'Tous' },
  ...PERSON_ROLES.filter((entry) => entry.id !== 'invite').map((entry) => ({
    title: entry.label,
    value: entry.id,
  })),
]
const paidItems = [
  { title: 'Tous', value: 'tous' },
  { title: 'Payé', value: 'paye' },
  { title: 'Non payé', value: 'non' },
]
const methodItems = PAYMENT_METHODS.map((method) => ({ title: method.label, value: method.id }))

const eligiblePeople = computed(() => adhesionPeople(inventory.people))

const filteredPeople = computed(() => {
  const q = search.value.trim()
  return sortPeople(
    eligiblePeople.value.filter((person) => {
      if (q && !matchesSearch(personSearchText(person), q)) return false
      if (role.value !== 'Tous' && !(person.roles || []).includes(role.value)) return false
      const paid = isPaid(person)
      if (paidFilter.value === 'paye' && !paid) return false
      if (paidFilter.value === 'non' && paid) return false
      return true
    }),
  )
})

const paidCount = computed(() => filteredPeople.value.filter((person) => isPaid(person)).length)

const hasActiveFilters = computed(
  () => Boolean(search.value.trim()) || role.value !== 'Tous' || paidFilter.value !== 'tous',
)

function isPaid(person) {
  if (Object.prototype.hasOwnProperty.call(paidOverrides, person.id)) return Boolean(paidOverrides[person.id])
  return hasPaidSeason(person, seasonId.value)
}

function methodOf(person) {
  if (Object.prototype.hasOwnProperty.call(methodOverrides, person.id)) return methodOverrides[person.id]
  return personAdhesionMethod(person, seasonId.value)
}

function resetFilters() {
  search.value = ''
  role.value = 'Tous'
  paidFilter.value = 'tous'
}

async function saveAdhesion(person, { paid, methode }) {
  if (!auth.can('people.write')) return
  error.value = ''
  paidOverrides[person.id] = Boolean(paid)
  if (paid) methodOverrides[person.id] = methode || ''
  else methodOverrides[person.id] = ''
  saving[person.id] = true
  try {
    const saved = await api.setPersonAdhesion(person.id, {
      seasonId: seasonId.value,
      paid: Boolean(paid),
      methode: methode || '',
    })
    inventory.upsertPerson(saved)
    delete paidOverrides[person.id]
    delete methodOverrides[person.id]
  } catch (err) {
    delete paidOverrides[person.id]
    delete methodOverrides[person.id]
    error.value = err.message || 'Impossible d’enregistrer l’adhésion.'
  } finally {
    delete saving[person.id]
  }
}

async function setPaid(person, paid) {
  if (!paid) {
    await saveAdhesion(person, { paid: false })
    return
  }
  const methode = methodOf(person)
  if (!methode) {
    error.value = 'Choisissez un moyen de paiement.'
    return
  }
  await saveAdhesion(person, { paid: true, methode })
}

async function setMethod(person, methode) {
  const next = String(methode || '')
  methodOverrides[person.id] = next
  if (!next) {
    if (isPaid(person)) await saveAdhesion(person, { paid: false })
    else delete methodOverrides[person.id]
    return
  }
  await saveAdhesion(person, { paid: true, methode: next })
}

onMounted(() => inventory.refresh().catch(() => {}))

watch(seasonId, () => {
  for (const key of Object.keys(paidOverrides)) delete paidOverrides[key]
  for (const key of Object.keys(methodOverrides)) delete methodOverrides[key]
})
</script>

<style scoped>
.adhesion-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding: 10px 4px;
  border-bottom: 1px solid rgba(44, 51, 74, 0.08);
}
.adhesion-row:last-child {
  border-bottom: 0;
}
.adhesion-row__identity {
  flex: 1 1 180px;
}
.adhesion-row__name {
  font-weight: 700;
  color: inherit;
  text-decoration: none;
}
.adhesion-row__name:hover {
  text-decoration: underline;
}
.adhesion-row__method {
  flex: 1 1 180px;
  max-width: 240px;
}
.adhesion-row__switch {
  flex: 0 0 auto;
}
.min-width-0 {
  min-width: 0;
}
</style>

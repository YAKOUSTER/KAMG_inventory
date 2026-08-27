<template>
  <div>
    <div class="d-flex flex-wrap align-center ga-3 page-header">
      <h1 class="text-h5 text-md-h4 page-title">À ranger</h1>
      <v-spacer />
      <v-btn variant="text" class="text-none" to="/personnes">Personnes</v-btn>
    </div>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Les inscriptions arrivent ici. Reliez chaque compte à une fiche danseur, ou aux enfants pour un parent.
    </p>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4" closable @click:close="error = ''">
      {{ error }}
    </v-alert>
    <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-4" />

    <v-alert v-if="!loading && !pending.length" type="info" variant="tonal">
      Personne en attente pour le moment.
    </v-alert>

    <article v-for="account in pending" :key="account.id" class="stack-item">
      <div class="d-flex flex-wrap align-center ga-2">
        <span class="text-subtitle-1 font-weight-bold">{{ account.nom }}</span>
        <v-chip size="small" variant="tonal">{{ relationLabel(account) }}</v-chip>
        <v-spacer />
        <span class="text-body-2 text-medium-emphasis">{{ account.email || account.login }}</span>
      </div>
      <p v-if="account.signup?.childrenNames" class="text-body-2 mt-2 mb-1">
        Enfant(s) : {{ account.signup.childrenNames }}
      </p>
      <p v-if="account.signup?.telephone" class="text-body-2 mb-1">Tél. {{ account.signup.telephone }}</p>
      <p v-if="account.signup?.message" class="text-body-2 mb-1">« {{ account.signup.message }} »</p>
      <div class="d-flex flex-wrap ga-2 mt-3">
        <v-btn size="small" color="primary" class="text-none" @click="openPlace(account)">Ranger</v-btn>
        <v-btn size="small" variant="text" color="error" class="text-none" @click="refuse(account)">Refuser</v-btn>
      </div>
    </article>

    <v-dialog v-model="dialog" :fullscreen="!mdAndUp" max-width="640" scrollable>
      <v-card v-if="current">
        <v-card-title class="d-flex align-center">
          <span>Ranger {{ current.nom }}</span>
          <v-spacer />
          <v-btn icon variant="text" aria-label="Fermer" @click="dialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text>
          <p class="text-body-2 text-medium-emphasis mb-4">
            {{
              isParent
                ? 'Choisissez la ou les fiches des enfants. Les deux parents peuvent être liés à la même fiche.'
                : 'Reliez à une fiche existante, ou créez-en une et cochez le groupe de danse.'
            }}
          </p>
          <v-alert v-if="matchedPeople.length" type="info" variant="tonal" class="mb-4">
            Fiche déjà présente :
            {{ matchedPeople.map((person) => personDisplayName(person)).join(', ') }}.
            Elle sera liée à ce compte — ne créez pas une seconde fiche.
          </v-alert>
          <v-autocomplete
            v-model="personIds"
            :items="personItems"
            :label="isParent ? 'Fiche(s) enfant' : 'Fiche existante'"
            multiple
            chips
            closable-chips
            hide-details
            class="mb-4"
          />
          <v-checkbox
            v-if="!isParent"
            v-model="createPerson"
            label="Créer une fiche danseur à partir de cette inscription"
            hide-details
            class="mb-3"
          />
          <v-alert v-if="!isParent && createPerson && matchedPeople.length" type="warning" variant="tonal" class="mb-3">
            Une fiche du même nom existe déjà. Cocher « créer » sans « créer quand même » reliera
            cette fiche, sans doublon.
          </v-alert>
          <v-checkbox
            v-if="!isParent && createPerson && matchedPeople.length"
            v-model="forceCreate"
            label="Créer une nouvelle fiche malgré la correspondance (doublon volontaire)"
            hide-details
            class="mb-3"
          />
          <div v-if="createPerson" class="mb-2">
            <div class="text-caption mb-2">Groupe</div>
            <v-chip-group v-model="roles" multiple column>
              <v-chip v-for="role in PERSON_ROLES" :key="role.id" :value="role.id" filter variant="outlined" color="primary">
                {{ role.label }}
              </v-chip>
            </v-chip-group>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" class="text-none" @click="dialog = false">Annuler</v-btn>
          <v-btn color="primary" class="text-none" :loading="saving" @click="save">Enregistrer</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useDisplay } from 'vuetify'
import { api } from '@/services/api'
import { PERSON_ROLES, matchingPeopleForAccount, personDisplayName } from '@/domain/person'
import { SIGNUP_RELATIONS } from '@/domain/memberAccount'
import { useInventoryStore } from '@/stores/inventory'

const display = useDisplay()
const mdAndUp = computed(() => display.mdAndUp.value)
const inventory = useInventoryStore()
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const pending = ref([])
const dialog = ref(false)
const current = ref(null)
const personIds = ref([])
const createPerson = ref(false)
const forceCreate = ref(false)
const roles = ref([])

const isParent = computed(() => current.value?.signup?.relation === 'parent')
const matchedPeople = computed(() =>
  current.value && !isParent.value
    ? matchingPeopleForAccount(inventory.people, current.value)
    : [],
)
const personItems = computed(() =>
  [...inventory.people]
    .map((person) => ({ title: personDisplayName(person), value: person.id }))
    .sort((a, b) => a.title.localeCompare(b.title, 'fr')),
)

function relationLabel(account) {
  return SIGNUP_RELATIONS.find((entry) => entry.id === account.signup?.relation)?.label || 'Inscription'
}

async function load() {
  loading.value = true
  try {
    pending.value = await api.pendingMembers()
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

function openPlace(account) {
  current.value = account
  const matches =
    account.signup?.relation === 'parent' ? [] : matchingPeopleForAccount(inventory.people, account)
  personIds.value = matches.map((person) => person.id)
  createPerson.value = account.signup?.relation !== 'parent' && matches.length === 0
  forceCreate.value = false
  roles.value = account.signup?.relation === 'parent' ? [] : ['danseur_loisir']
  error.value = ''
  dialog.value = true
}

async function save() {
  if (!current.value) return
  saving.value = true
  error.value = ''
  try {
    await api.placeMember(current.value.id, {
      personIds: personIds.value,
      createPerson: createPerson.value,
      forceCreate: Boolean(createPerson.value && forceCreate.value),
      roles: roles.value,
    })
    dialog.value = false
    await inventory.refresh({ force: true })
    await load()
  } catch (err) {
    error.value = err.message
  } finally {
    saving.value = false
  }
}

async function refuse(account) {
  if (!confirm(`Refuser l’inscription de ${account.nom} ?`)) return
  try {
    await api.placeMember(account.id, { refuse: true })
    await load()
  } catch (err) {
    error.value = err.message
  }
}

onMounted(async () => {
  await inventory.refresh()
  await load()
})
</script>

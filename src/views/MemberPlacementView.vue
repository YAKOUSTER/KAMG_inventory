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
                ? 'Créez ou reliez les fiches des enfants (costumes et sondages). Cochez « Je danse aussi » si le parent a sa propre fiche danseur. Une fiche parent sert au CA à se souvenir de la famille, même s’il ne danse pas.'
                : 'Reliez à une fiche existante, ou créez-en une et cochez le groupe de danse.'
            }}
          </p>
          <v-alert v-if="dialogError" type="error" variant="tonal" class="mb-4">{{ dialogError }}</v-alert>
          <v-alert v-if="matchedPeople.length" type="info" variant="tonal" class="mb-4">
            Fiche déjà présente :
            {{ matchedPeople.map((person) => personDisplayName(person)).join(', ') }}.
            Elle sera liée à ce compte — ne créez pas une seconde fiche.
          </v-alert>
          <v-alert v-if="matchedChildren.length" type="info" variant="tonal" class="mb-4">
            Enfant(s) déjà en fiche :
            {{ matchedChildren.map((person) => personDisplayName(person)).join(', ') }}.
          </v-alert>
          <v-autocomplete
            v-model="personIds"
            :items="personItems"
            :label="isParent ? 'Relier une fiche enfant déjà existante' : 'Fiche existante'"
            multiple
            chips
            closable-chips
            hide-details
            class="mb-4"
          />
          <div v-if="isParent && unmatchedDrafts.length" class="mb-4">
            <p class="text-body-2 mb-2">
              Pas encore de fiche pour
              {{ unmatchedDrafts.map((draft) => draft.label).join(', ') }}.
              Cochez pour en créer une, utilisable ensuite pour les costumes.
            </p>
            <v-checkbox
              v-for="draft in unmatchedDrafts"
              :key="draft.prenom + draft.nom"
              :model-value="createChildNames.includes(draft.prenom)"
              :label="`Créer la fiche de ${draft.label}`"
              hide-details
              class="mb-1"
              @update:model-value="toggleChildDraft(draft.prenom, $event)"
            />
            <div v-if="createChildNames.length" class="mt-3">
              <div class="text-caption mb-2">Groupe de l’enfant</div>
              <v-chip-group v-model="childRoles" multiple column>
                <v-chip
                  v-for="role in PERSON_ROLES"
                  :key="`child-${role.id}`"
                  :value="role.id"
                  filter
                  variant="outlined"
                  color="primary"
                >
                  {{ role.label }}
                </v-chip>
              </v-chip-group>
            </div>
          </div>
          <v-checkbox
            v-if="isParent"
            v-model="alsoDances"
            label="Le parent danse aussi : relier ou créer sa fiche danseur"
            hide-details
            class="mb-3"
          />
          <v-checkbox
            v-model="createPerson"
            :label="isParent ? 'Créer la fiche du parent (pour le CA, même s’il ne danse pas)' : 'Créer une fiche danseur à partir de cette inscription'"
            hide-details
            class="mb-3"
          />
          <v-alert v-if="createPerson && matchedPeople.length" type="warning" variant="tonal" class="mb-3">
            Une fiche du même nom existe déjà. Cocher « créer » sans « créer quand même » reliera
            cette fiche, sans doublon.
          </v-alert>
          <v-checkbox
            v-if="createPerson && matchedPeople.length"
            v-model="forceCreate"
            label="Créer une nouvelle fiche malgré la correspondance (doublon volontaire)"
            hide-details
            class="mb-3"
          />
          <div v-if="createPerson && (!isParent || alsoDances)" class="mb-2">
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
import { PERSON_ROLES, matchingPeopleForAccount, matchingPeopleForChildrenNames, unmatchedChildDrafts, personDisplayName } from '@/domain/person'
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
const alsoDances = ref(false)
const roles = ref([])
const createChildNames = ref([])
const childRoles = ref(['danseur_enfant'])
const dialogError = ref('')

const isParent = computed(() => current.value?.signup?.relation === 'parent')
const matchedPeople = computed(() =>
  current.value ? matchingPeopleForAccount(inventory.people, current.value) : [],
)
const matchedChildren = computed(() =>
  current.value && isParent.value
    ? matchingPeopleForChildrenNames(
        inventory.people,
        current.value.signup?.childrenNames,
        current.value.signup?.nom || current.value.nom,
      )
    : [],
)
const unmatchedDrafts = computed(() =>
  current.value && isParent.value
    ? unmatchedChildDrafts(
        inventory.people,
        current.value.signup?.childrenNames,
        current.value.signup?.nom || current.value.nom,
      )
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
  const parent = account.signup?.relation === 'parent'
  const selfMatches = matchingPeopleForAccount(inventory.people, account)
  const childMatches = parent
    ? matchingPeopleForChildrenNames(
        inventory.people,
        account.signup?.childrenNames,
        account.signup?.nom || account.nom,
      )
    : []
  personIds.value = parent ? childMatches.map((person) => person.id) : selfMatches.map((person) => person.id)
  alsoDances.value = Boolean(account.signup?.alsoDances)
  createPerson.value = selfMatches.length === 0
  forceCreate.value = false
  roles.value = parent && !account.signup?.alsoDances ? [] : ['danseur_loisir']
  createChildNames.value = parent
    ? unmatchedChildDrafts(
        inventory.people,
        account.signup?.childrenNames,
        account.signup?.nom || account.nom,
      ).map((draft) => draft.prenom)
    : []
  childRoles.value = ['danseur_enfant']
  error.value = ''
  dialogError.value = ''
  dialog.value = true
}

function toggleChildDraft(prenom, checked) {
  const id = String(prenom || '').trim()
  if (!id) return
  if (checked) {
    if (!createChildNames.value.includes(id)) createChildNames.value = [...createChildNames.value, id]
    return
  }
  createChildNames.value = createChildNames.value.filter((entry) => entry !== id)
}

async function save() {
  if (!current.value) return
  saving.value = true
  error.value = ''
  dialogError.value = ''
  try {
    await api.placeMember(current.value.id, {
      personIds: personIds.value,
      createPerson: createPerson.value,
      forceCreate: Boolean(createPerson.value && forceCreate.value),
      alsoDances: Boolean(alsoDances.value),
      familyChildIds: isParent.value ? personIds.value : [],
      createChildren: isParent.value && createChildNames.value.length > 0,
      createChildNames: isParent.value ? createChildNames.value : [],
      childRoles: childRoles.value,
      roles: roles.value,
    })
    dialog.value = false
    await inventory.refresh({ force: true })
    await load()
  } catch (err) {
    dialogError.value = err.message
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

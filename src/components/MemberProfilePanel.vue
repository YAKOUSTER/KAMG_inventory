<template>
  <div class="member-profile">
    <v-alert v-if="!profiles.length" type="info" variant="tonal" class="mb-4">
      Votre fiche n’est pas encore liée. Le conseil d’administration pourra le faire depuis « À ranger ».
    </v-alert>

    <template v-if="profiles.length">
      <v-select
        v-if="profiles.length > 1"
        v-model="selectedId"
        :items="profileItems"
        label="Fiche"
        hide-details
        density="compact"
        class="mb-4"
      />

      <template v-if="!editing">
        <section class="member-profile__consult">
          <div class="member-profile__identity">
            <div
              class="member-profile__avatar"
              :style="coverSrc ? { backgroundImage: `url(${coverSrc})` } : undefined"
            >
              <v-icon v-if="!coverSrc" size="40" color="primary">mdi-account</v-icon>
            </div>
            <div>
              <h2 class="member-profile__name">{{ personDisplayName(selected) }}</h2>
              <p v-if="form.tailleLettre" class="member-profile__meta">Taille {{ form.tailleLettre }}</p>
              <p v-else class="member-profile__meta">Taille non renseignée</p>
            </div>
          </div>
          <v-btn color="primary" class="text-none" prepend-icon="mdi-pencil" @click="startEdit">
            Modifier
          </v-btn>
        </section>

        <section class="member-section">
          <h2 class="member-section__title">Biographie</h2>
          <p v-if="form.bio" class="member-profile__bio">{{ form.bio }}</p>
          <p v-else class="member-section__intro">Pas encore de biographie. Cliquez sur Modifier pour en ajouter une.</p>
        </section>

        <section class="member-section">
          <h2 class="member-section__title">Mesures et pointures</h2>
          <v-table v-if="consultMeasures.length" class="measure-table" density="compact">
            <tbody>
              <tr v-for="field in consultMeasures" :key="field.key">
                <td>{{ field.label }}</td>
                <td>{{ field.value }}</td>
              </tr>
            </tbody>
          </v-table>
          <p v-else class="member-section__intro">Aucune mensuration renseignée.</p>
        </section>
      </template>

      <template v-else>
        <section class="member-section">
          <h2 class="member-section__title">Photo</h2>
          <p class="member-section__intro">Une photo aide l’atelier costume et les membres de votre groupe à vous reconnaître.</p>
          <ItemPhotos v-model="form.images" :code="photoCode" variant="avatar" />
        </section>

        <section class="member-section">
          <h2 class="member-section__title">Biographie</h2>
          <p class="member-section__intro">
            Quelques mots visibles par les membres de votre groupe de danse.
          </p>
          <v-textarea
            v-model="form.bio"
            hide-details
            rows="3"
            auto-grow
            :maxlength="PERSON_BIO_MAX"
            counter
          />
        </section>

        <section class="member-section">
          <h2 class="member-section__title">Mesures et pointures</h2>
          <p class="member-section__intro">Facultatif — utile pour préparer un emprunt.</p>
          <FieldRow label="Taille générale">
            <v-select v-model="form.tailleLettre" :items="tailleItems" hide-details />
          </FieldRow>
          <div class="form-fields-grid form-fields-grid--2 mt-3">
            <FieldRow v-for="field in PERSON_MEASUREMENTS" :key="field.key" :label="field.label">
              <v-text-field v-model.number="form.mesures[field.key]" hide-details type="number" />
            </FieldRow>
          </div>
        </section>

        <v-alert v-if="error" type="error" variant="tonal" class="mb-3">{{ error }}</v-alert>
        <v-alert v-if="saved" type="success" variant="tonal" class="mb-3">Profil enregistré.</v-alert>
        <div class="member-profile__actions">
          <v-btn variant="text" class="text-none" :disabled="saving" @click="cancelEdit">Annuler</v-btn>
          <v-btn color="primary" class="text-none" :loading="saving" @click="saveProfile">
            Enregistrer
          </v-btn>
        </div>
      </template>

      <section class="member-section">
        <h2 class="member-section__title">Ce que j’ai avec moi</h2>
        <p class="member-section__intro">Pièces encore en votre possession.</p>
        <div v-if="heldItems.length" class="member-stack">
          <article v-for="line in heldItems" :key="`${line.loanId}-${line.itemId}`" class="member-card">
            <h3 class="member-card__title">{{ line.code }} — {{ line.nom }}</h3>
            <p class="member-card__meta">{{ line.loanTitre }} · emprunté le {{ displayDate(line.dateEmprunt) }}</p>
            <p v-if="line.comment" class="member-card__meta">{{ line.comment }}</p>
          </article>
        </div>
        <v-alert v-else type="info" variant="tonal">Aucune pièce en cours d’emprunt.</v-alert>
      </section>
    </template>

    <div class="member-profile__account">
      <v-btn
        v-if="canOpenGestion"
        variant="tonal"
        class="text-none"
        prepend-icon="mdi-briefcase-outline"
        :to="gestionHome"
      >
        Gestion
      </v-btn>
      <v-btn variant="text" class="text-none" @click="emit('logout')">Déconnexion</v-btn>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { api } from '@/services/api'
import {
  PERSON_BIO_MAX,
  PERSON_MEASUREMENTS,
  emptyMesures,
  filledMeasurements,
  personDisplayName,
} from '@/domain/person'
import { displayDate } from '@/domain/dates'
import { itemsInPossession } from '@/domain/loans'
import { canAccessGestion, gestionHomePath } from '@/domain/gestionNav'
import { useAuthStore } from '@/stores/auth'
import FieldRow from '@/components/FieldRow.vue'
import ItemPhotos from '@/components/ItemPhotos.vue'

const props = defineProps({
  profiles: { type: Array, default: () => [] },
  selfLoans: { type: Array, default: () => [] },
  tailles: { type: Array, default: () => [] },
})

const emit = defineEmits(['updated', 'logout'])
const auth = useAuthStore()
const selectedId = ref(props.profiles[0]?.id || '')
const editing = ref(false)
const saving = ref(false)
const saved = ref(false)
const error = ref('')
const form = reactive({
  images: [],
  mesures: emptyMesures(),
  tailleLettre: '',
  bio: '',
})

const canOpenGestion = computed(() => canAccessGestion(auth.user))
const gestionHome = computed(() => gestionHomePath(auth.user))
const profileItems = computed(() =>
  props.profiles.map((person) => ({ title: personDisplayName(person), value: person.id })),
)
const selected = computed(() => props.profiles.find((person) => person.id === selectedId.value) || props.profiles[0] || null)
const photoCode = computed(() => (selected.value ? `profil-${selected.value.id}` : 'profil'))
const tailleItems = computed(() => ['', ...(props.tailles || [])])
const heldItems = computed(() =>
  itemsInPossession(props.selfLoans.filter((loan) => loan.personId === selected.value?.id)),
)
const coverSrc = computed(() => form.images.find((img) => img.principale)?.src || form.images[0]?.src || '')
const consultMeasures = computed(() => filledMeasurements({ mesures: form.mesures }))

function applyProfile(person) {
  form.images = [...(person?.images || [])]
  form.mesures = { ...emptyMesures(), ...(person?.mesures || {}) }
  form.tailleLettre = person?.tailleLettre || ''
  form.bio = person?.bio || ''
}

watch(
  () => props.profiles,
  (list) => {
    if (!list.length) {
      selectedId.value = ''
      return
    }
    if (!list.some((person) => person.id === selectedId.value)) selectedId.value = list[0].id
  },
  { immediate: true },
)

watch(
  selected,
  (person) => {
    if (person) {
      applyProfile(person)
      editing.value = false
      error.value = ''
      saved.value = false
    }
  },
  { immediate: true },
)

function startEdit() {
  applyProfile(selected.value)
  editing.value = true
  error.value = ''
  saved.value = false
}

function cancelEdit() {
  applyProfile(selected.value)
  editing.value = false
  error.value = ''
  saved.value = false
}

async function saveProfile() {
  if (!selected.value) return
  saving.value = true
  error.value = ''
  saved.value = false
  try {
    const updated = await api.updateMemberProfile(selected.value.id, {
      images: form.images,
      mesures: form.mesures,
      tailleLettre: form.tailleLettre,
      bio: form.bio,
    })
    emit('updated', updated)
    saved.value = true
    editing.value = false
    applyProfile(updated)
  } catch (err) {
    error.value = err.message || 'Impossible d’enregistrer le profil.'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.member-section {
  margin-bottom: 16px;
}

.member-section__title {
  font-size: 1.15rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  margin: 0 0 8px;
  color: var(--kamg-ink);
}

.member-section__intro {
  color: rgba(44, 51, 44, 0.72);
  margin: 0 0 10px;
}

.member-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.member-card {
  background: #fff;
  border: 1px solid var(--kamg-border);
  border-radius: var(--kamg-radius);
  box-shadow: var(--kamg-shadow);
  padding: 16px;
}

.member-card__title {
  font-size: 1.02rem;
  margin: 0 0 4px;
}

.member-card__meta {
  margin: 0;
  font-size: 0.92rem;
  color: rgba(44, 51, 44, 0.72);
}

.member-profile__account {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
  padding-top: 16px;
  border-top: 1px solid var(--kamg-border);
}

.member-profile__consult {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.member-profile__identity {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.member-profile__avatar {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  background: var(--kamg-linen) center / cover no-repeat;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.member-profile__name {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 800;
  letter-spacing: -0.03em;
}

.member-profile__meta {
  margin: 4px 0 0;
  color: rgba(44, 51, 44, 0.72);
}

.member-profile__bio {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.45;
}

.member-profile__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-bottom: 16px;
}

.measure-table td:first-child {
  color: rgba(44, 51, 44, 0.72);
  padding-left: 0;
}

.measure-table td:last-child {
  font-weight: 600;
}
</style>

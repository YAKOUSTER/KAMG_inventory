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

      <section class="member-section">
        <h2 class="member-section__title">Photo</h2>
        <p class="member-section__intro">Une photo aide l’atelier costume à vous reconnaître.</p>
        <ItemPhotos v-model="form.images" :code="photoCode" variant="avatar" @change="savePhotos" />
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

      <section class="member-section">
        <h2 class="member-section__title">Note à l’atelier vêtement</h2>
        <p class="member-section__intro">
          Un pense-bête pour l’atelier, par exemple : « J’ai laissé ma housse dans le local FLG, je la
          récupère la semaine prochaine. »
        </p>
        <v-textarea
          v-model="form.noteAtelier"
          hide-details
          rows="3"
          auto-grow
          maxlength="1000"
        />
      </section>

      <v-alert v-if="error" type="error" variant="tonal" class="mb-3">{{ error }}</v-alert>
      <v-alert v-if="saved" type="success" variant="tonal" class="mb-3">Profil enregistré.</v-alert>
      <v-btn color="primary" class="text-none mb-6" :loading="saving" @click="saveProfile">
        Enregistrer le profil
      </v-btn>

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
import { PERSON_MEASUREMENTS, emptyMesures, personDisplayName } from '@/domain/person'
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
const saving = ref(false)
const saved = ref(false)
const error = ref('')
const form = reactive({
  images: [],
  mesures: emptyMesures(),
  tailleLettre: '',
  noteAtelier: '',
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

function applyProfile(person) {
  form.images = [...(person?.images || [])]
  form.mesures = { ...emptyMesures(), ...(person?.mesures || {}) }
  form.tailleLettre = person?.tailleLettre || ''
  form.noteAtelier = person?.noteAtelier || ''
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

watch(selected, (person) => {
  if (person) applyProfile(person)
}, { immediate: true })

async function persist(extra = {}) {
  if (!selected.value) return null
  error.value = ''
  saved.value = false
  const updated = await api.updateMemberProfile(selected.value.id, {
    images: form.images,
    mesures: form.mesures,
    tailleLettre: form.tailleLettre,
    noteAtelier: form.noteAtelier,
    ...extra,
  })
  emit('updated', updated)
  return updated
}

async function savePhotos(images) {
  form.images = images
  try {
    await persist({ images })
  } catch (err) {
    error.value = err.message || 'Impossible d’enregistrer la photo.'
  }
}

async function saveProfile() {
  saving.value = true
  try {
    await persist()
    saved.value = true
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
</style>

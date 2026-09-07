<template>
  <section class="member-section">
    <h2 class="member-section__title">Mémo au Groupe Vêtement</h2>
    <p class="member-section__intro">
      Un pense-bête pour l’atelier costume, par exemple : « J’ai laissé ma housse dans le local FLG, je la
      récupère la semaine prochaine. »
    </p>

    <v-alert v-if="!profiles.length" type="info" variant="tonal">
      Votre fiche n’est pas encore liée. Le mémo pourra être ajouté ensuite.
    </v-alert>

    <template v-else>
      <v-select
        v-if="profiles.length > 1"
        v-model="selectedId"
        :items="profileItems"
        label="Fiche"
        hide-details
        density="compact"
        class="mb-3"
      />
      <v-textarea
        v-model="note"
        hide-details
        rows="3"
        auto-grow
        maxlength="1000"
        placeholder="Message pour le Groupe Vêtement"
      />
      <v-alert v-if="error" type="error" variant="tonal" class="mt-3">{{ error }}</v-alert>
      <v-alert v-if="saved" type="success" variant="tonal" class="mt-3">Mémo enregistré.</v-alert>
      <v-btn color="primary" class="text-none mt-3" :loading="saving" :disabled="!selected" @click="save">
        Enregistrer le mémo
      </v-btn>
    </template>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { api } from '@/services/api'
import { personDisplayName } from '@/domain/person'

const props = defineProps({
  profiles: { type: Array, default: () => [] },
})

const emit = defineEmits(['updated'])
const selectedId = ref(props.profiles[0]?.id || '')
const note = ref('')
const saving = ref(false)
const saved = ref(false)
const error = ref('')

const profileItems = computed(() =>
  props.profiles.map((person) => ({ title: personDisplayName(person), value: person.id })),
)
const selected = computed(
  () => props.profiles.find((person) => person.id === selectedId.value) || props.profiles[0] || null,
)

watch(
  () => props.profiles,
  (list) => {
    if (!list.length) {
      selectedId.value = ''
      note.value = ''
      return
    }
    if (!list.some((person) => person.id === selectedId.value)) selectedId.value = list[0].id
  },
  { immediate: true },
)

watch(
  selected,
  (person) => {
    note.value = person?.noteAtelier || ''
    saved.value = false
    error.value = ''
  },
  { immediate: true },
)

async function save() {
  if (!selected.value) return
  saving.value = true
  saved.value = false
  error.value = ''
  try {
    const updated = await api.updateMemberProfile(selected.value.id, { noteAtelier: note.value })
    emit('updated', updated)
    saved.value = true
  } catch (err) {
    error.value = err.message || 'Impossible d’enregistrer le mémo.'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.member-section {
  margin-bottom: 20px;
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
</style>

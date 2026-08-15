<template>
  <v-form ref="form" @submit.prevent="submit">
    <v-card class="mb-4" variant="outlined">
      <v-card-title>Identité</v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12" md="6">
            <v-text-field v-model="person.nom" label="Nom" :rules="[required]" />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field v-model="person.role" label="Rôle (danseuse, costumier…)" />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field v-model="person.telephone" label="Téléphone" />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field v-model="person.email" label="Email" />
          </v-col>
          <v-col cols="12" md="4">
            <v-select v-model="person.tailleLettre" :items="['', ...DEFAULT_REFERENTIELS.tailles]" label="Taille générale" />
          </v-col>
          <v-col cols="12">
            <v-textarea v-model="person.notes" label="Notes" rows="2" />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-card class="mb-4" variant="outlined">
      <v-card-title>Photo</v-card-title>
      <v-card-text>
        <ItemPhotos v-model="person.images" :code="person.nom || 'personne'" />
      </v-card-text>
    </v-card>

    <v-card class="mb-4" variant="outlined">
      <v-card-title>Mensurations pour une tenue complète</v-card-title>
      <v-card-text>
        <v-row>
          <v-col v-for="field in PERSON_MEASUREMENTS" :key="field.key" cols="12" sm="6" md="4">
            <v-text-field v-model.number="person.mesures[field.key]" :label="field.label" type="number" />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <div class="d-flex ga-3 justify-end form-actions">
      <v-btn variant="text" :to="cancelTo">Annuler</v-btn>
      <v-btn type="submit" color="primary" :loading="saving">{{ submitLabel }}</v-btn>
    </div>
  </v-form>
</template>

<script setup>
import { reactive, ref, watch } from 'vue'
import { DEFAULT_REFERENTIELS } from '@/domain/taxonomy'
import { PERSON_MEASUREMENTS, emptyPerson } from '@/domain/person'
import { normalizeImages } from '@/domain/images'
import ItemPhotos from './ItemPhotos.vue'

const props = defineProps({
  initial: { type: Object, default: null },
  saving: { type: Boolean, default: false },
  submitLabel: { type: String, default: 'Enregistrer' },
  cancelTo: { type: [String, Object], default: '/personnes' },
})
const emit = defineEmits(['save'])
const form = ref(null)
const person = reactive(emptyPerson())
const required = (v) => !!v || 'Champ requis'

watch(
  () => props.initial,
  (value) => {
    Object.assign(person, emptyPerson(), value || {})
    person.images = normalizeImages(person.images)
    person.mesures = { ...emptyPerson().mesures, ...(value?.mesures || {}) }
  },
  { immediate: true, deep: true },
)

async function submit() {
  const result = await form.value.validate()
  if (!result.valid) return
  emit('save', {
    ...person,
    images: normalizeImages(person.images),
    mesures: { ...emptyPerson().mesures, ...person.mesures },
  })
}
</script>

<style scoped>
.form-actions {
  position: sticky;
  bottom: 0;
  z-index: 2;
  padding: 12px 0 4px;
  background: linear-gradient(180deg, rgba(244, 246, 244, 0), #f4f6f4 28%);
}
</style>

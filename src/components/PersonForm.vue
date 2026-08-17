<template>
  <v-form ref="form" @submit.prevent="submit">
    <section class="form-block">
      <h2 class="section-label">Identité</h2>
      <div class="form-fields-grid form-fields-grid--2">
        <FieldRow label="Prénom">
          <v-text-field v-model="person.prenom" hide-details="auto" :rules="[required]" />
        </FieldRow>
        <FieldRow label="Nom">
          <v-text-field v-model="person.nom" hide-details="auto" :rules="[required]" />
        </FieldRow>
        <FieldRow v-if="person.roles.includes('membre')" label="Année">
          <v-select v-model="person.anneeMembre" :items="membershipYears()" hide-details clearable />
        </FieldRow>
        <FieldRow label="Téléphone">
          <v-text-field v-model="person.telephone" hide-details />
        </FieldRow>
        <FieldRow label="Courriel">
          <v-text-field v-model="person.email" hide-details />
        </FieldRow>
        <FieldRow label="Taille générale">
          <v-select v-model="person.tailleLettre" :items="['', ...DEFAULT_REFERENTIELS.tailles]" hide-details />
        </FieldRow>
      </div>
      <div class="section-label mt-5 mb-2">Rôles</div>
      <v-row>
        <v-col v-for="role in PERSON_ROLES" :key="role.id" cols="12" sm="6" md="4">
          <v-checkbox
            v-model="person.roles"
            :value="role.id"
            :label="role.label"
            hide-details
            density="compact"
          />
        </v-col>
      </v-row>
      <FieldRow label="Notes" align-top class="mt-4">
        <v-textarea v-model="person.notes" hide-details rows="2" />
      </FieldRow>
    </section>

    <section class="form-block">
      <h2 class="section-label">Photo</h2>
      <ItemPhotos v-model="person.images" :code="photoCode" />
    </section>

    <section class="form-block">
      <h2 class="section-label">Mensurations pour une tenue complète</h2>
      <div class="form-fields-grid form-fields-grid--2">
        <FieldRow v-for="field in PERSON_MEASUREMENTS" :key="field.key" :label="field.label">
          <v-text-field v-model.number="person.mesures[field.key]" hide-details type="number" />
        </FieldRow>
      </div>
    </section>

    <div class="d-flex ga-3 justify-end form-actions">
      <v-btn variant="text" :to="cancelTo">Annuler</v-btn>
      <v-btn type="submit" color="primary" :loading="saving">{{ submitLabel }}</v-btn>
    </div>
  </v-form>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { DEFAULT_REFERENTIELS } from '@/domain/taxonomy'
import {
  PERSON_MEASUREMENTS,
  PERSON_ROLES,
  emptyPerson,
  membershipYears,
  normalizeRoles,
  personDisplayName,
} from '@/domain/person'
import { normalizeImages } from '@/domain/images'
import FieldRow from './FieldRow.vue'
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
const photoCode = computed(() => personDisplayName(person) || 'personne')

watch(
  () => props.initial,
  (value) => {
    Object.assign(person, emptyPerson(), value || {})
    person.images = normalizeImages(person.images)
    person.mesures = { ...emptyPerson().mesures, ...(value?.mesures || {}) }
    person.roles = normalizeRoles(value || person)
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
    roles: [...person.roles],
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

<template>
  <div class="return-item-form">
    <div class="text-subtitle-2 font-weight-bold mb-3">
      {{ line.code }} — {{ line.nom }}
    </div>

    <div class="form-fields-grid form-fields-grid--2">
      <FieldRow label="État actuel">
        <v-text-field :model-value="line.etat || '—'" hide-details readonly />
      </FieldRow>
      <FieldRow label="Nouvel état">
        <v-select v-model="form.etat" :items="etats" hide-details clearable placeholder="Conserver l’actuel" />
      </FieldRow>
    </div>

    <FieldRow label="Propreté" class="mt-3">
      <v-btn-toggle v-model="propreChoice" mandatory density="compact" color="primary">
        <v-btn value="propre" size="small">Propre</v-btn>
        <v-btn value="sale" size="small">Sale</v-btn>
      </v-btn-toggle>
    </FieldRow>

    <div v-if="propreChoice === 'sale'" class="mt-3">
      <FieldRow label="Pressing payé par">
        <v-radio-group v-model="form.pressingPayePar" hide-details inline density="compact">
          <v-radio label="Le cercle" value="cercle" />
          <v-radio label="Une personne" value="personne" />
        </v-radio-group>
      </FieldRow>
      <FieldRow v-if="form.pressingPayePar === 'personne'" label="Personne">
        <v-autocomplete
          v-model="form.pressingPayeParPersonId"
          :items="peopleOptions"
          item-title="label"
          item-value="id"
          hide-details
        />
      </FieldRow>
    </div>

    <FieldRow label="Note sur la pièce" hint="ajoutée à la description" align-top class="mt-3">
      <v-textarea v-model="form.descriptionAppend" hide-details rows="2" placeholder="Tache, accroc constaté au retour…" />
    </FieldRow>

    <div class="mt-3">
      <div class="text-body-2 font-weight-medium mb-2">Action à prévoir</div>
      <div class="d-flex ga-2 align-start">
        <v-combobox
          v-model="actionDraft"
          :items="ACTION_PRESETS"
          hide-details
          class="flex-grow-1"
          placeholder="Recoudre un bouton, à laver…"
        />
        <v-btn variant="tonal" color="primary" :disabled="!actionDraft.trim()" @click="addAction">Ajouter</v-btn>
      </div>
      <div v-if="form.aFaire.length" class="d-flex flex-wrap ga-2 mt-2">
        <v-chip v-for="(text, index) in form.aFaire" :key="`${text}-${index}`" closable @click:close="removeAction(index)">
          {{ text }}
        </v-chip>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ACTION_PRESETS } from '@/domain/itemTasks'
import FieldRow from './FieldRow.vue'

const props = defineProps({
  line: { type: Object, required: true },
  etats: { type: Array, default: () => [] },
  people: { type: Array, default: () => [] },
  defaultPersonId: { type: String, default: '' },
})

const form = reactive(emptyForm())
const actionDraft = ref('')
const propreChoice = ref('propre')

const peopleOptions = computed(() =>
  props.people.map((person) => ({
    id: person.id,
    label: [person.prenom, person.nom].filter(Boolean).join(' '),
  })),
)

watch(
  () => props.line.itemId,
  () => reset(),
  { immediate: true },
)

watch(propreChoice, (value) => {
  form.propre = value === 'propre'
})

function emptyForm() {
  return {
    etat: '',
    propre: true,
    pressingPayePar: 'cercle',
    pressingPayeParPersonId: '',
    descriptionAppend: '',
    aFaire: [],
  }
}

function reset() {
  Object.assign(form, emptyForm())
  form.pressingPayeParPersonId = props.defaultPersonId || ''
  propreChoice.value = props.line.propre === false ? 'sale' : 'propre'
  form.propre = propreChoice.value === 'propre'
  actionDraft.value = ''
}

function addAction() {
  const text = actionDraft.value.trim()
  if (!text) return
  form.aFaire.push(text)
  actionDraft.value = ''
}

function removeAction(index) {
  form.aFaire.splice(index, 1)
}

function payload() {
  return {
    etat: form.etat || undefined,
    propre: form.propre,
    pressingPayePar: propreChoice.value === 'sale' ? form.pressingPayePar : '',
    pressingPayeParPersonId:
      propreChoice.value === 'sale' && form.pressingPayePar === 'personne'
        ? form.pressingPayeParPersonId || props.defaultPersonId
        : '',
    descriptionAppend: form.descriptionAppend,
    aFaire: [...form.aFaire],
  }
}

defineExpose({ payload })
</script>

<style scoped>
.return-item-form + .return-item-form {
  margin-top: 1.25rem;
  padding-top: 1.25rem;
  border-top: 1px solid rgba(44, 51, 74, 0.08);
}
</style>

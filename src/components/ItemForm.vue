<template>
  <v-form ref="form" @submit.prevent="submit">
    <v-row>
      <v-col cols="12">
        <v-btn-toggle v-model="item.categorie" mandatory color="primary" divided>
          <v-btn v-for="cat in CATEGORIES" :key="cat.id" :value="cat.id" size="small">
            <v-icon start>{{ cat.icon }}</v-icon>
            {{ cat.label }}
          </v-btn>
        </v-btn-toggle>
      </v-col>
    </v-row>

    <v-card class="mb-4" variant="tonal" color="kamg">
      <v-card-title>1. Identification</v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12" md="4">
            <v-select
              v-model="item.type"
              :items="typesForCategory"
              label="Type"
              :rules="[required]"
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field v-model="item.code" label="Code d'inventaire" :rules="[required]" />
          </v-col>
          <v-col cols="12" md="5">
            <v-text-field v-model="item.nom" label="Nom" :rules="[required]" />
          </v-col>
          <v-col cols="12" md="4">
            <v-select v-model="item.epoque" :items="withBlank(referentiels.epoques)" label="Époque" />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field v-model="item.origine" label="Origine / pays / cercle" />
          </v-col>
          <v-col cols="12" md="4">
            <v-select v-model="item.etat" :items="withBlank(referentiels.etats)" label="État" />
          </v-col>
          <v-col cols="12" md="4">
            <v-select v-model="item.disponibilite" :items="referentiels.disponibilites" label="Disponibilité" />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field v-model="item.proprietaire" label="Propriétaire / déposant" />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field v-model="item.localisation" label="Localisation (armoire, tiroir…)" />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-card class="mb-4" variant="outlined">
      <v-card-title>2. Description matérielle</v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12">
            <v-textarea v-model="item.description" label="Description" rows="3" />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field v-model="item.materiau" label="Matière" />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field v-model="item.composition" label="Composition" />
          </v-col>
          <v-col cols="12" md="4">
            <v-combobox v-model="item.couleur" :items="referentiels.couleurs" label="Couleur" />
          </v-col>
          <v-col cols="12" md="3">
            <v-checkbox v-model="item.perle" label="Perlé" hide-details />
          </v-col>
          <v-col cols="12" md="3">
            <v-checkbox v-model="item.broderie" label="Brodé" hide-details />
          </v-col>
          <v-col cols="12" md="6" v-if="item.perle || item.broderie">
            <v-text-field v-model="item.motif" label="Motif" />
          </v-col>
          <v-col cols="12">
            <v-combobox v-model="item.tags" :items="[]" label="Mots-clés" multiple chips closable-chips />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-card v-if="item.categorie === 'tissu' || item.categorie === 'echantillon'" class="mb-4" variant="outlined">
      <v-card-title>{{ item.categorie === 'tissu' ? '3. Tissu' : '3. Échantillon' }}</v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12" md="4">
            <v-text-field v-model="item.armure" label="Armure / technique" />
          </v-col>
          <template v-if="item.categorie === 'tissu'">
            <v-col cols="12" md="4">
              <v-text-field v-model.number="item.laize" label="Laize (cm)" type="number" />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field v-model.number="item.metrage" label="Métrage restant (m)" type="number" step="0.1" />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field v-model.number="item.raccordMotif" label="Raccord de motif (cm)" type="number" />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field v-model.number="item.grammage" label="Grammage (g/m²)" type="number" />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field v-model="item.fournisseur" label="Fournisseur" />
            </v-col>
          </template>
          <template v-else>
            <v-col cols="12" md="4">
              <v-text-field v-model.number="item.largeurEchantillon" label="Largeur (cm)" type="number" />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field v-model.number="item.hauteurEchantillon" label="Hauteur (cm)" type="number" />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field v-model.number="item.grammage" label="Grammage (g/m²)" type="number" />
            </v-col>
            <v-col cols="12" md="8">
              <v-select
                v-model="item.pieceSourceId"
                :items="pieceOptions"
                item-title="label"
                item-value="id"
                label="Pièce source (si extrait d'un costume)"
                clearable
              />
            </v-col>
          </template>
        </v-row>
      </v-card-text>
    </v-card>

    <v-card v-if="item.categorie === 'piece_collection'" class="mb-4" variant="outlined">
      <v-card-title>3. Collection / conservation</v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12" md="4">
            <v-text-field v-model="item.numeroInventaire" label="N° d'inventaire patrimonial" />
          </v-col>
          <v-col cols="12" md="4">
            <v-select v-model="item.modeAcquisition" :items="withBlank(referentiels.modesAcquisition)" label="Mode d'acquisition" />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field v-model="item.dateAcquisition" label="Date d'acquisition" type="date" />
          </v-col>
          <v-col cols="12">
            <v-text-field v-model="item.provenance" label="Provenance" />
          </v-col>
          <v-col cols="12">
            <v-textarea v-model="item.notesConservation" label="Notes de conservation" rows="3" />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-card v-if="showCostumeMeasures" class="mb-4" variant="outlined">
      <v-card-title>3. Mesures</v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12" md="4">
            <v-select v-model="item.tailleLettre" :items="withBlank(referentiels.tailles)" label="Taille générale" />
          </v-col>
          <v-col v-for="field in activeMeasureFields" :key="field.key" cols="12" md="4">
            <v-text-field v-model.number="item[field.key]" :label="field.label" type="number" />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field v-model.number="item.longueurVariable" label="Longueur de…" type="number" />
          </v-col>
          <v-col cols="12" md="8">
            <v-text-field v-model="item.variable" label="Élément mesuré (velours, dentelle, moire…)" />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-card class="mb-4" variant="outlined">
      <v-card-title>Photos</v-card-title>
      <v-card-text>
        <p class="text-body-2 text-medium-emphasis mb-4">
          Les fichiers sont enregistrés à côté du JSON (<code>data/uploads</code>), comme dans AppMEUR :
          pas d’hébergement d’images payant. Plusieurs vues par pièce (face, dos, détail, étiquette).
        </p>
        <ItemPhotos v-model="item.images" :code="item.code" />
      </v-card-text>
    </v-card>

    <v-card class="mb-4" variant="outlined">
      <v-card-title>Liens et notes</v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12">
            <v-autocomplete
              v-model="item.linkedItemIds"
              :items="pieceOptions"
              item-title="label"
              item-value="id"
              label="Pièces liées"
              multiple
              chips
              closable-chips
            />
          </v-col>
          <v-col v-if="item.categorie !== 'piece_collection'" cols="12">
            <v-textarea v-model="item.notesConservation" label="Notes" rows="2" />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <div class="d-flex ga-3 justify-end">
      <v-btn variant="text" :to="cancelTo">Annuler</v-btn>
      <v-btn type="submit" color="primary" :loading="saving">{{ submitLabel }}</v-btn>
    </div>
  </v-form>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { CATEGORIES, DEFAULT_REFERENTIELS, MEASUREMENT_FIELDS, visibleMeasurements } from '@/domain/taxonomy'
import { emptyItem } from '@/domain/item'
import { normalizeImages } from '@/domain/images'
import ItemPhotos from './ItemPhotos.vue'

const props = defineProps({
  initial: { type: Object, default: null },
  items: { type: Array, default: () => [] },
  saving: { type: Boolean, default: false },
  submitLabel: { type: String, default: 'Enregistrer' },
  cancelTo: { type: [String, Object], default: '/inventaire' },
})

const emit = defineEmits(['save'])
const form = ref(null)
const item = reactive(emptyItem())
const referentiels = DEFAULT_REFERENTIELS
const required = (v) => !!v || 'Champ requis'

function assign(source) {
  Object.assign(item, emptyItem(source?.categorie), source || {})
  if (!Array.isArray(item.tags)) item.tags = []
  item.images = normalizeImages(item.images)
  if (!Array.isArray(item.linkedItemIds)) item.linkedItemIds = []
}

watch(
  () => props.initial,
  (value) => assign(value),
  { immediate: true, deep: true },
)

watch(
  () => item.categorie,
  () => {
    if (item.type && !typesForCategory.value.includes(item.type)) {
      item.type = ''
    }
  },
)

const typesForCategory = computed(
  () => referentiels.typesParCategorie[item.categorie] || [],
)

const showCostumeMeasures = computed(() =>
  ['piece_costume', 'accessoire', 'piece_collection'].includes(item.categorie),
)

const measures = computed(() => visibleMeasurements(item.type))
const activeMeasureFields = computed(() => MEASUREMENT_FIELDS.filter((field) => measures.value[field.key]))

const pieceOptions = computed(() =>
  props.items
    .filter((candidate) => candidate.id !== item.id)
    .map((candidate) => ({ id: candidate.id, label: `${candidate.code} — ${candidate.nom}` })),
)

function withBlank(list = []) {
  return list
}

async function submit() {
  const result = await form.value.validate()
  if (!result.valid) return
  emit('save', { ...item })
}
</script>

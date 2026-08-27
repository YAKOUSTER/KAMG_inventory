<template>
  <v-form ref="form" @submit.prevent="submit">
    <section class="form-block">
      <div class="category-tabs d-flex flex-wrap ga-2">
        <v-btn
          v-for="cat in categories"
          :key="cat.id"
          type="button"
          class="text-none category-tab"
          :variant="item.categorie === cat.id ? 'flat' : 'text'"
          :color="item.categorie === cat.id ? 'primary' : undefined"
          @click="item.categorie = cat.id"
        >
          <v-icon start>{{ cat.icon }}</v-icon>
          {{ cat.label }}
        </v-btn>
      </div>
    </section>

    <section class="form-block form-section">
      <h2 class="section-label">Identification</h2>
      <div class="form-fields-grid form-fields-grid--3">
        <FieldRow label="Type">
          <v-select v-model="item.type" :items="typesForCategory" hide-details="auto" :rules="[required]" />
        </FieldRow>
        <FieldRow label="Code d'inventaire">
          <v-text-field v-model="item.code" hide-details="auto" :rules="[required]" />
        </FieldRow>
        <FieldRow label="Nom">
          <v-text-field v-model="item.nom" hide-details="auto" :rules="[required]" />
        </FieldRow>
        <FieldRow v-if="!isFourniture && !isMateriel" label="Époque">
          <v-select v-model="item.epoque" :items="withBlank(referentiels.epoques)" hide-details />
        </FieldRow>
        <FieldRow v-if="!isFourniture && !isMateriel" label="Origine / pays / cercle" hint="ex. Pays Glazig — saisissez puis Entrée">
          <TagCombobox v-model="item.origines" :suggestions="referentiels.origines" />
        </FieldRow>
        <FieldRow v-if="!isFourniture" label="État">
          <v-select v-model="item.etat" :items="withBlank(referentiels.etats)" hide-details />
        </FieldRow>
        <FieldRow v-if="!isFourniture" label="Disponibilité">
          <v-select v-model="item.disponibilite" :items="referentiels.disponibilites" hide-details />
        </FieldRow>
        <FieldRow
          v-if="showReconstitutionField"
          label="Reconstitution"
          hint="Cochez si la pièce a été reconstituée de façon historiquement incorrecte"
          align-top
          class="form-fields-grid__span-3"
        >
          <v-checkbox
            v-model="item.erreurReconstitution"
            label="Erreur de reconstitution"
            hide-details
          />
        </FieldRow>
        <FieldRow v-if="isFourniture" label="Fournisseur">
          <v-text-field v-model="item.fournisseur" hide-details />
        </FieldRow>
        <FieldRow
          v-if="!isFourniture"
          label="Propriétaire"
          hint="Si la pièce appartient à une personne qui la prête au cercle"
        >
          <v-text-field v-model="item.proprietaire" hide-details />
        </FieldRow>
        <FieldRow
          v-if="isMateriel"
          label="Local"
          hint="Où se trouve ce matériel"
        >
          <v-select
            v-model="item.local"
            :items="localItems"
            hide-details="auto"
            :rules="[required]"
          />
        </FieldRow>
        <FieldRow :label="isMateriel ? 'Emplacement dans le local' : 'Localisation'" :hint="isMateriel ? 'étagère, armoire…' : 'armoire, tiroir…'">
          <v-text-field v-model="item.localisation" hide-details />
        </FieldRow>
      </div>
    </section>

    <section class="form-block form-section">
      <h2 class="section-label">Description matérielle</h2>
      <div class="form-fields">
        <FieldRow label="Description" align-top>
          <v-textarea v-model="item.description" hide-details rows="3" />
        </FieldRow>
      </div>
      <div class="form-fields-grid form-fields-grid--3 mt-2">
        <FieldRow label="Matière" hint="Fibres ou matériau principal (lin, laine, coton…)">
          <v-text-field v-model="item.materiau" hide-details />
        </FieldRow>
        <FieldRow label="Composition" hint="Détail chiffré ou mixte (ex. 80 % coton, 20 % polyester)">
          <v-text-field v-model="item.composition" hide-details />
        </FieldRow>
        <FieldRow label="Couleurs">
          <TagCombobox v-model="item.couleurs" :suggestions="referentiels.couleurs" />
        </FieldRow>
      </div>
      <FieldRow v-if="!isFourniture && !isMateriel" label="Techniques" class="mt-2" hint="Perlé, brodé…">
        <TagCombobox v-model="item.techniques" :suggestions="referentiels.techniques" />
      </FieldRow>
      <FieldRow v-if="!isFourniture && !isMateriel && item.techniques.length" label="Motif" class="mt-2">
        <v-text-field v-model="item.motif" hide-details />
      </FieldRow>
      <FieldRow label="Autres tags" class="mt-2">
        <TagCombobox v-model="item.tags" :suggestions="referentiels.tags" />
      </FieldRow>
    </section>

    <section v-if="hasStockTracking" class="form-block form-section">
      <h2 class="section-label">Quantité restante</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        En {{ isFourniture ? 'pièces, mètres, grammes…' : 'mètres, grammes, rouleaux…' }}.
        Le statut ({{ isFourniture ? 'En stock' : 'Disponible' }} / Stock bas / Rupture) se calcule automatiquement.
        Les mouvements se gèrent aussi depuis la fiche détail.
      </p>
      <div class="form-fields-grid form-fields-grid--3">
        <FieldRow label="Quantité restante">
          <v-text-field v-model.number="item.stockQuantite" hide-details type="number" min="0" step="any" />
        </FieldRow>
        <FieldRow label="Unité" hint="m, g, pièce…">
          <v-select v-model="item.stockUnite" :items="stockUnitItems" hide-details />
        </FieldRow>
        <FieldRow label="Seuil d’alerte" hint="alerte stock bas">
          <v-text-field v-model.number="item.stockSeuil" hide-details type="number" min="0" step="any" />
        </FieldRow>
        <FieldRow label="Réf. fournisseur / SKU" class="form-fields-grid__span-2">
          <v-text-field v-model="item.stockReference" hide-details />
        </FieldRow>
        <FieldRow label="Statut calculé">
          <v-text-field :model-value="stockStatusPreview" hide-details readonly />
        </FieldRow>
      </div>
    </section>

    <section v-if="item.categorie === 'tissu' || item.categorie === 'echantillon'" class="form-block form-section">
      <h2 class="section-label">{{ item.categorie === 'tissu' ? 'Tissu' : 'Échantillon' }}</h2>
      <div class="form-fields-grid form-fields-grid--3">
        <FieldRow label="Armure / technique">
          <v-text-field v-model="item.armure" hide-details />
        </FieldRow>
        <template v-if="item.categorie === 'tissu'">
          <FieldRow label="Laize (cm)">
            <v-text-field v-model.number="item.laize" hide-details type="number" />
          </FieldRow>
          <FieldRow label="Raccord de motif (cm)">
            <v-text-field v-model.number="item.raccordMotif" hide-details type="number" />
          </FieldRow>
          <FieldRow label="Grammage (g/m²)">
            <v-text-field v-model.number="item.grammage" hide-details type="number" />
          </FieldRow>
          <FieldRow label="Fournisseur">
            <v-text-field v-model="item.fournisseur" hide-details />
          </FieldRow>
        </template>
        <template v-else>
          <FieldRow label="Largeur (cm)">
            <v-text-field v-model.number="item.largeurEchantillon" hide-details type="number" />
          </FieldRow>
          <FieldRow label="Hauteur (cm)">
            <v-text-field v-model.number="item.hauteurEchantillon" hide-details type="number" />
          </FieldRow>
          <FieldRow label="Grammage (g/m²)">
            <v-text-field v-model.number="item.grammage" hide-details type="number" />
          </FieldRow>
          <FieldRow label="Pièce source" hint="si extrait d'un costume">
            <v-select
              v-model="item.pieceSourceId"
              :items="pieceOptions"
              item-title="label"
              item-value="id"
              hide-details
              clearable
            />
          </FieldRow>
        </template>
      </div>
    </section>

    <section v-if="item.categorie === 'piece_collection'" class="form-block">
      <h2 class="section-label">Collection / conservation</h2>
      <div class="form-fields-grid form-fields-grid--3">
        <FieldRow label="Mode d'acquisition">
          <v-select v-model="item.modeAcquisition" :items="withBlank(referentiels.modesAcquisition)" hide-details />
        </FieldRow>
        <FieldRow label="Date d'acquisition">
          <v-text-field v-model="item.dateAcquisition" hide-details type="date" />
        </FieldRow>
        <FieldRow label="Provenance" class="form-fields-grid__span-2">
          <v-text-field v-model="item.provenance" hide-details />
        </FieldRow>
      </div>
      <FieldRow label="Notes de conservation" align-top class="mt-2">
        <v-textarea v-model="item.notesConservation" hide-details rows="3" />
      </FieldRow>
    </section>

    <section v-if="showCostumeMeasures" class="form-block">
      <h2 class="section-label">Mesures</h2>
      <div class="form-fields-grid form-fields-grid--3">
        <FieldRow label="Taille générale">
          <v-select v-model="item.tailleLettre" :items="withBlank(referentiels.tailles)" hide-details />
        </FieldRow>
        <FieldRow v-for="field in activeMeasureFields" :key="field.key" :label="field.label">
          <v-text-field v-model.number="item[field.key]" hide-details type="number" />
        </FieldRow>
        <FieldRow label="Longueur de…">
          <v-text-field v-model.number="item.longueurVariable" hide-details type="number" />
        </FieldRow>
        <FieldRow label="Élément mesuré" hint="velours, dentelle, moire…">
          <v-text-field v-model="item.variable" hide-details />
        </FieldRow>
      </div>
    </section>

    <section class="form-block">
      <h2 class="section-label">Photos</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Les fichiers sont enregistrés à côté du JSON (<code>data/uploads</code>) :
        pas d’hébergement d’images payant. Plusieurs vues par pièce (face, dos, détail, étiquette).
      </p>
      <FieldRow label="Photos par défaut" hint="même visuel pour plusieurs tailles ou variantes" class="mb-4">
        <v-autocomplete
          v-model="item.photoSourceId"
          :items="photoSourceOptions"
          item-title="label"
          item-value="id"
          hide-details
          clearable
          placeholder="Choisir une fiche modèle…"
        />
      </FieldRow>
      <v-alert
        v-if="inheritedPhotos.length && !ownPhotos.length"
        type="info"
        variant="tonal"
        density="compact"
        class="mb-4"
      >
        Cette fiche affichera les photos de
        <strong>{{ photoSourceLabel }}</strong>
        tant qu’elle n’a pas de photo propre.
      </v-alert>
      <div v-if="inheritedPhotos.length && !ownPhotos.length" class="d-flex ga-2 mb-4 flex-wrap">
        <v-img
          v-for="img in inheritedPhotos.slice(0, 4)"
          :key="img.id"
          :src="img.src"
          width="72"
          height="72"
          cover
          class="rounded"
        />
      </div>
      <ItemPhotos v-model="item.images" :code="item.code" />
    </section>

    <section class="form-block">
      <h2 class="section-label">Pièces jointes</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Documents complémentaires : croquis, dessins, patrons, scans PDF…
        Les fichiers sont stockés dans <code>data/uploads</code>, comme les photos.
      </p>
      <ItemAttachments v-model="item.attachments" :code="item.code" />
    </section>

    <section class="form-block">
      <h2 class="section-label">Liens et notes</h2>
      <div class="form-fields">
        <FieldRow label="Pièces liées">
          <v-autocomplete
            v-model="item.linkedItemIds"
            :items="pieceOptions"
            item-title="label"
            item-value="id"
            hide-details
            multiple
            chips
            closable-chips
          />
        </FieldRow>
        <FieldRow v-if="item.categorie !== 'piece_collection'" label="Notes" align-top>
          <v-textarea v-model="item.notesConservation" hide-details rows="2" />
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
import { MEASUREMENT_FIELDS, STORAGE_LOCALS, isMateriel as checkMateriel, visibleMeasurements } from '@/domain/taxonomy'
import { categoriesWithMeta } from '@/domain/referentiels'
import { useInventoryStore } from '@/stores/inventory'
import { emptyItem, normalizeStringList } from '@/domain/item'
import { showReconstitutionErrorField } from '@/domain/reconstitution'
import {
  defaultStockUnit,
  hasStock,
  isFourniture as checkFourniture,
  stockUnitsFor,
  syncStockDisponibilite,
} from '@/domain/stock'
import { normalizeImages, effectiveImages } from '@/domain/images'
import { normalizeAttachments } from '@/domain/attachments'
import FieldRow from './FieldRow.vue'
import TagCombobox from './TagCombobox.vue'
import ItemPhotos from './ItemPhotos.vue'
import ItemAttachments from './ItemAttachments.vue'

const props = defineProps({
  initial: { type: Object, default: null },
  items: { type: Array, default: () => [] },
  saving: { type: Boolean, default: false },
  submitLabel: { type: String, default: 'Enregistrer' },
  cancelTo: { type: [String, Object], default: '/gestion/inventaire' },
})

const emit = defineEmits(['save'])
const form = ref(null)
const item = reactive(emptyItem())
const inventory = useInventoryStore()
const referentiels = computed(() => inventory.resolvedReferentiels)
const categories = computed(() => categoriesWithMeta(referentiels.value))
const required = (v) => !!v || 'Champ requis'

function assign(source) {
  Object.assign(item, emptyItem(source?.categorie), source || {})
  item.origines = normalizeStringList(item.origines?.length ? item.origines : item.origine)
  item.couleurs = normalizeStringList(item.couleurs?.length ? item.couleurs : item.couleur)
  item.techniques = normalizeStringList(item.techniques)
  item.tags = normalizeStringList(item.tags)
  if (item.perle && !item.techniques.includes('Perlé')) item.techniques.push('Perlé')
  if (item.broderie && !item.techniques.includes('Brodé')) item.techniques.push('Brodé')
  item.erreurReconstitution = Boolean(item.erreurReconstitution ?? false)
  item.images = normalizeImages(item.images)
  item.attachments = normalizeAttachments(item.attachments)
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
    if (hasStock(item) && !item.stockUnite) {
      item.stockUnite = defaultStockUnit(item.type, item.categorie)
    }
    if (item.categorie === 'tissu' && item.stockQuantite != null) {
      item.metrage = item.stockQuantite
    }
  },
)

watch(
  () => item.type,
  (type) => {
    if (hasStock(item) && type) {
      item.stockUnite = defaultStockUnit(type, item.categorie)
    }
  },
)

watch(
  () => [item.stockQuantite, item.stockSeuil, item.categorie],
  () => {
    if (hasStock(item)) {
      syncStockDisponibilite(item)
      if (item.categorie === 'tissu') item.metrage = item.stockQuantite
    }
  },
)

const isFourniture = computed(() => checkFourniture(item))
const isMateriel = computed(() => checkMateriel(item))
const hasStockTracking = computed(() => hasStock(item))
const showReconstitutionField = computed(() => showReconstitutionErrorField(item))
const stockUnitItems = computed(() => {
  const units = stockUnitsFor(item)
  const current = item.stockUnite
  return current && !units.includes(current) ? [...units, current] : units
})

const stockStatusPreview = computed(() => {
  if (!hasStockTracking.value) return ''
  syncStockDisponibilite(item)
  return item.disponibilite
})

const localItems = computed(() => STORAGE_LOCALS.map((entry) => ({ title: entry.label, value: entry.id })))

const typesForCategory = computed(
  () => referentiels.value.typesParCategorie[item.categorie] || [],
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

const photoSourceOptions = computed(() => pieceOptions.value)

const getItemById = (id) => props.items.find((entry) => entry.id === id)

const ownPhotos = computed(() => normalizeImages(item.images))

const inheritedPhotos = computed(() => effectiveImages(item, getItemById))

const photoSourceLabel = computed(() => {
  const source = getItemById(item.photoSourceId)
  return source ? `${source.code} — ${source.nom}` : 'la fiche modèle'
})

function withBlank(list = []) {
  return list
}

async function submit() {
  const result = await form.value.validate()
  if (!result.valid) return
  emit('save', { ...item })
}
</script>

<style scoped>
.category-tabs {
  margin-bottom: 4px;
}

.category-tab {
  min-height: 48px;
  padding-inline: 18px;
  font-size: 0.95rem;
  letter-spacing: 0.01em;
}

.category-tab :deep(.v-icon) {
  font-size: 1.25rem;
}

.form-actions {
  position: sticky;
  bottom: 0;
  z-index: 2;
  padding: 12px 0 4px;
  background: linear-gradient(180deg, rgba(244, 246, 244, 0), #f4f6f4 28%);
}
</style>

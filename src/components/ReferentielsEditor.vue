<template>
  <section class="page-block">
    <h2 class="section-label">Listes de paramétrage</h2>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Personnalisez les listes proposées dans les formulaires et les filtres :
      catégories, types, époques, états, couleurs… Les modifications s’appliquent à toute l’application.
    </p>

    <v-expansion-panels variant="accordion" class="referentiels-panels">
      <v-expansion-panel title="Catégories">
        <v-expansion-panel-text>
          <p class="text-caption text-medium-emphasis mb-3">
            Les catégories structurent l’inventaire. L’identifiant technique reste fixe ; seul le libellé est modifiable.
          </p>
          <div v-for="(category, index) in draft.categories" :key="category.id" class="category-row">
            <div class="text-caption text-medium-emphasis mb-1">{{ category.id }}</div>
            <div class="d-flex ga-2 align-start">
              <v-text-field
                v-model="category.label"
                label="Libellé"
                density="compact"
                hide-details
                class="flex-grow-1"
              />
              <v-text-field
                v-model="category.plural"
                label="Pluriel (tableau de bord)"
                density="compact"
                hide-details
                class="flex-grow-1"
              />
              <v-btn
                icon
                variant="text"
                color="error"
                :disabled="draft.categories.length <= 1"
                @click="removeCategory(index)"
              >
                <v-icon>mdi-delete-outline</v-icon>
              </v-btn>
            </div>
          </div>
          <div class="d-flex ga-2 mt-4">
            <v-text-field
              v-model="newCategoryLabel"
              label="Nouvelle catégorie"
              density="compact"
              hide-details
              class="flex-grow-1"
              @keyup.enter="addCategory"
            />
            <v-btn color="primary" variant="tonal" :disabled="!newCategoryLabel.trim()" @click="addCategory">
              Ajouter
            </v-btn>
          </div>
        </v-expansion-panel-text>
      </v-expansion-panel>

      <v-expansion-panel title="Types par catégorie">
        <v-expansion-panel-text>
          <v-tabs v-model="typesTab" density="compact" class="mb-4">
            <v-tab v-for="category in draft.categories" :key="category.id" :value="category.id">
              {{ category.label }}
            </v-tab>
          </v-tabs>
          <ReferentielListEditor
            v-if="activeCategoryId"
            v-model="draft.typesParCategorie[activeCategoryId]"
            label="Types proposés pour cette catégorie"
            hint="Ex. Chemise/Roched, Jupe, Toile…"
          />
        </v-expansion-panel-text>
      </v-expansion-panel>

      <v-expansion-panel title="Époques, états, disponibilités">
        <v-expansion-panel-text>
          <ReferentielListEditor v-model="draft.epoques" label="Époques" hint="Décennies, périodes…" />
          <ReferentielListEditor v-model="draft.etats" label="États de conservation" />
          <ReferentielListEditor
            v-model="draft.disponibilites"
            label="Disponibilités"
            hint="« Disponible » et « Emprunté » doivent rester dans la liste."
          />
        </v-expansion-panel-text>
      </v-expansion-panel>

      <v-expansion-panel title="Couleurs, tailles, acquisitions">
        <v-expansion-panel-text>
          <ReferentielListEditor v-model="draft.couleurs" label="Couleurs" />
          <ReferentielListEditor v-model="draft.tailles" label="Tailles générales" />
          <ReferentielListEditor v-model="draft.modesAcquisition" label="Modes d’acquisition" />
          <ReferentielListEditor v-model="draft.unitesStock" label="Unités de stock" hint="pièce, m, bobine…" />
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>

    <v-alert v-if="message" :type="ok ? 'success' : 'error'" class="mt-4" density="compact">{{ message }}</v-alert>

    <div class="d-flex ga-3 mt-4">
      <v-btn variant="text" @click="resetDraft">Annuler les modifications</v-btn>
      <v-spacer />
      <v-btn color="primary" :loading="saving" @click="save">Enregistrer les listes</v-btn>
    </div>
  </section>
</template>

<script setup>
import { computed, reactive, ref, onMounted } from 'vue'
import { api } from '@/services/api'
import { normalizeReferentiels, slugCategoryId } from '@/domain/referentiels'
import { useInventoryStore } from '@/stores/inventory'
import ReferentielListEditor from './ReferentielListEditor.vue'

const inventory = useInventoryStore()
const saving = ref(false)
const message = ref('')
const ok = ref(false)
const newCategoryLabel = ref('')
const typesTab = ref('')

const draft = reactive(normalizeReferentiels({}))

onMounted(() => {
  Object.assign(draft, normalizeReferentiels(inventory.referentiels || {}))
  typesTab.value = draft.categories[0]?.id || ''
})

const activeCategoryId = computed(() => typesTab.value || draft.categories[0]?.id || '')

function resetDraft() {
  Object.assign(draft, normalizeReferentiels(inventory.referentiels || {}))
  message.value = ''
}

function addCategory() {
  const label = newCategoryLabel.value.trim()
  if (!label) return
  let id = slugCategoryId(label)
  let suffix = 2
  while (draft.categories.some((cat) => cat.id === id)) {
    id = `${slugCategoryId(label)}_${suffix}`
    suffix += 1
  }
  draft.categories.push({ id, label, plural: label })
  draft.typesParCategorie[id] = []
  typesTab.value = id
  newCategoryLabel.value = ''
}

function removeCategory(index) {
  const [removed] = draft.categories.splice(index, 1)
  if (removed?.id) delete draft.typesParCategorie[removed.id]
  if (typesTab.value === removed?.id) {
    typesTab.value = draft.categories[0]?.id || ''
  }
}

async function save() {
  saving.value = true
  message.value = ''
  try {
    const saved = await api.updateReferentiels(normalizeReferentiels(draft))
    inventory.setReferentiels(saved)
    Object.assign(draft, saved)
    ok.value = true
    message.value = 'Listes enregistrées.'
  } catch (error) {
    ok.value = false
    message.value = error.message || 'Enregistrement impossible.'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.category-row + .category-row {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(44, 51, 74, 0.08);
}
.referentiels-panels {
  border-radius: 12px;
  overflow: hidden;
}
</style>
